import { useCallback, useEffect, useState } from "react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";

type CleaningOrder = {
  id: number;
  bedId: number;
  room: string | null;
  bedCode: string | null;
  protocol: string;
  status: string;
};

export function CleaningOrdersPage() {
  const { user } = useAuth();
  const role = user?.role ?? "servicios_generales";
  const [orders, setOrders] = useState<CleaningOrder[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<{ orders: CleaningOrder[] }>("/api/v1/beds/cleaning-orders");
      setOrders(data.orders);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudieron cargar las órdenes de limpieza."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function complete(order: CleaningOrder) {
    try {
      await api(`/api/v1/beds/cleaning-orders/${order.id}/complete`, { method: "POST" });
      setNotice(`Limpieza ${order.protocol === "deep" ? "profunda" : "estándar"} completada.`);
      await load();
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la desinfección."));
    }
  }

  async function equip(order: CleaningOrder) {
    try {
      await api(`/api/v1/beds/${order.bedId}/equip`, { method: "POST" });
      setNotice("Unidad equipada con lencería e insumos.");
      await load();
    } catch (caught) {
      setError(errorText(caught, "No se pudo marcar la unidad como equipada."));
    }
  }

  async function release(order: CleaningOrder) {
    try {
      await api(`/api/v1/beds/${order.bedId}/release`, { method: "POST" });
      setNotice("Cama habilitada en el censo central.");
      await load();
    } catch (caught) {
      setError(errorText(caught, "No se pudo habilitar la cama."));
    }
  }

  if (loading) return <LoadingState label="Cargando órdenes de limpieza…" />;

  return (
    <Sheet kicker="Gestión de camas" title="Habilitación de unidades" wide>
      <p className="lead">Desinfección terminal, equipamiento y confirmación de disponibilidad.</p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      {orders.length === 0 ? (
        <Feedback tone="info">No hay órdenes de limpieza pendientes.</Feedback>
      ) : (
        <ul className="alert-list">
          {orders.map((order) => (
            <li key={order.id} className="alert-card">
              <h3>Habitación {order.room} {order.bedCode}</h3>
              <p>Protocolo {order.protocol === "deep" ? "profundo" : "estándar"} · {order.status}</p>
              {role === "servicios_generales" && order.status === "pendiente" ? (
                <Button type="button" onClick={() => void complete(order)}>Limpieza completada</Button>
              ) : null}
              {role === "auxiliar_enfermeria" && order.status === "completada" ? (
                <Button type="button" onClick={() => void equip(order)}>Unidad equipada</Button>
              ) : null}
              {role === "enfermera_supervisora" ? (
                <Button type="button" onClick={() => void release(order)}>Marcar disponible</Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
