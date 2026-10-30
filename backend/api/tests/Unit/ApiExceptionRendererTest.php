<?php

namespace Tests\Unit;

use App\Exceptions\ClinicalRuleException;
use App\Support\ApiExceptionRenderer;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class ApiExceptionRendererTest extends TestCase
{
    private const DNI_OBLIGATORIO = 'El DNI es obligatorio.';

    private function apiRequest(): Request
    {
        return Request::create('/api/v1/algo', 'GET');
    }

    public function test_no_responde_fuera_de_la_api(): void
    {
        $web = Request::create('/pagina', 'GET');

        $this->assertNull(ApiExceptionRenderer::render(new RuntimeException('x'), $web));
        $this->assertFalse(ApiExceptionRenderer::wantsJson($web));
    }

    public function test_responde_json_cuando_el_cliente_lo_pide(): void
    {
        $request = Request::create('/pagina', 'GET', server: ['HTTP_ACCEPT' => 'application/json']);

        $this->assertTrue(ApiExceptionRenderer::wantsJson($request));
        $this->assertSame(500, ApiExceptionRenderer::render(new RuntimeException('x'), $request)?->getStatusCode());
    }

    public function test_token_vencido_responde_419(): void
    {
        $response = ApiExceptionRenderer::render(new TokenMismatchException, $this->apiRequest());

        $this->assertSame(419, $response?->getStatusCode());
        $this->assertSame('La sesión expiró. Vuelva a intentarlo.', $response?->getData(true)['message']);
    }

    public function test_sin_autenticar_responde_401(): void
    {
        $response = ApiExceptionRenderer::render(new AuthenticationException, $this->apiRequest());

        $this->assertSame(401, $response?->getStatusCode());
        $this->assertSame('Debe iniciar sesión para continuar.', $response?->getData(true)['message']);
    }

    public function test_validacion_responde_422_con_el_primer_error(): void
    {
        $exception = ValidationException::withMessages(['dni' => [self::DNI_OBLIGATORIO]]);

        $response = ApiExceptionRenderer::render($exception, $this->apiRequest());

        $this->assertSame(422, $response?->getStatusCode());
        $this->assertSame(self::DNI_OBLIGATORIO, $response?->getData(true)['message']);
        $this->assertSame(['dni' => [self::DNI_OBLIGATORIO]], $response?->getData(true)['errors']);
    }

    public function test_validacion_sin_mensaje_usa_el_texto_por_defecto(): void
    {
        $response = ApiExceptionRenderer::render(ValidationException::withMessages([]), $this->apiRequest());

        $this->assertSame('Revise los datos e intente de nuevo.', $response?->getData(true)['message']);
    }

    public function test_regla_clinica_expone_mensaje_y_codigo(): void
    {
        $response = ApiExceptionRenderer::render(new ClinicalRuleException('Cama ocupada.', 'BED_BUSY'), $this->apiRequest());

        $this->assertSame(422, $response?->getStatusCode());
        $this->assertSame(['message' => 'Cama ocupada.', 'code' => 'BED_BUSY'], $response?->getData(true));
    }

    public function test_regla_clinica_sin_codigo_no_lo_incluye(): void
    {
        $response = ApiExceptionRenderer::render(new ClinicalRuleException('Falta el consentimiento.'), $this->apiRequest());

        $this->assertSame(['message' => 'Falta el consentimiento.'], $response?->getData(true));
    }

    public function test_los_errores_tecnicos_no_se_filtran_al_usuario(): void
    {
        $generic = 'No se pudo completar la operación. Intente de nuevo.';

        $server = ApiExceptionRenderer::render(new RuntimeException('SQLSTATE[23000]: boom'), $this->apiRequest());
        $notFound = ApiExceptionRenderer::render(new NotFoundHttpException('The route could not be found.'), $this->apiRequest());
        $empty = ApiExceptionRenderer::render(new NotFoundHttpException(''), $this->apiRequest());

        $this->assertSame(500, $server?->getStatusCode());
        $this->assertSame($generic, $server?->getData(true)['message']);
        $this->assertSame(404, $notFound?->getStatusCode());
        $this->assertSame($generic, $notFound?->getData(true)['message']);
        $this->assertSame($generic, $empty?->getData(true)['message']);
    }

    public function test_un_http_con_mensaje_legible_se_conserva(): void
    {
        $response = ApiExceptionRenderer::render(new NotFoundHttpException('Paciente no encontrado.'), $this->apiRequest());

        $this->assertSame(404, $response?->getStatusCode());
        $this->assertSame('Paciente no encontrado.', $response?->getData(true)['message']);
    }
}
