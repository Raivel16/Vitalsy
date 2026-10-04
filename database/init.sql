-- Esquema de Vitalsy generado desde las migraciones de Laravel.
-- Idempotente: CREATE TABLE IF NOT EXISTS y restricciones que toleran una segunda ejecucion.
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
SET default_tablespace = '';
SET default_table_access_method = heap;
--
-- Name: account_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.account_verifications (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    status character varying(40) DEFAULT 'pendiente'::character varying NOT NULL,
    verified_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: account_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.account_verifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: account_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_verifications_id_seq OWNED BY public.account_verifications.id;
--
-- Name: admission_encounters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.admission_encounters (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    order_number character varying(255) NOT NULL,
    transfer_order_number character varying(255),
    patient_name character varying(255) NOT NULL,
    document_type character varying(255) NOT NULL,
    document_number character varying(255) NOT NULL,
    origin_service character varying(255) NOT NULL,
    coverage_payer character varying(255) NOT NULL,
    coverage_status character varying(255) NOT NULL,
    coverage_plan character varying(255) NOT NULL,
    room character varying(255),
    bed character varying(255),
    service character varying(255),
    wristband_code character varying(255),
    record_id character varying(255),
    current_step character varying(255) NOT NULL,
    waiting_reason character varying(255),
    deliverables json NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    source character varying(255) DEFAULT 'demo'::character varying NOT NULL,
    clinical_payload json
);
--
-- Name: admission_encounters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.admission_encounters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: admission_encounters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admission_encounters_id_seq OWNED BY public.admission_encounters.id;
--
-- Name: alert_acknowledgements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.alert_acknowledgements (
    id bigint NOT NULL,
    alert_id bigint NOT NULL,
    user_id bigint,
    role character varying(255) NOT NULL,
    acknowledged_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: alert_acknowledgements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.alert_acknowledgements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: alert_acknowledgements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alert_acknowledgements_id_seq OWNED BY public.alert_acknowledgements.id;
--
-- Name: alert_escalations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.alert_escalations (
    id bigint NOT NULL,
    alert_id bigint NOT NULL,
    to_role character varying(255) NOT NULL,
    reason text NOT NULL,
    escalated_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: alert_escalations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.alert_escalations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: alert_escalations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alert_escalations_id_seq OWNED BY public.alert_escalations.id;
--
-- Name: alert_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.alert_events (
    id bigint NOT NULL,
    alert_id bigint NOT NULL,
    type character varying(255) NOT NULL,
    role character varying(255),
    user_id bigint,
    detail text,
    occurred_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: alert_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.alert_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: alert_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alert_events_id_seq OWNED BY public.alert_events.id;
--
-- Name: ambulatory_prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ambulatory_prescriptions (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    content json,
    issued_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: ambulatory_prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.ambulatory_prescriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: ambulatory_prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ambulatory_prescriptions_id_seq OWNED BY public.ambulatory_prescriptions.id;
--
-- Name: bed_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bed_assignments (
    id bigint NOT NULL,
    bed_id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    assigned_at timestamp(0) without time zone NOT NULL,
    released_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: bed_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.bed_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: bed_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bed_assignments_id_seq OWNED BY public.bed_assignments.id;
--
-- Name: bed_readiness_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bed_readiness_checks (
    id bigint NOT NULL,
    bed_id bigint NOT NULL,
    linen_ok boolean DEFAULT false NOT NULL,
    supplies_ok boolean DEFAULT false NOT NULL,
    confirmed_by bigint,
    confirmed_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: bed_readiness_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.bed_readiness_checks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: bed_readiness_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bed_readiness_checks_id_seq OWNED BY public.bed_readiness_checks.id;
--
-- Name: bed_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bed_requests (
    id bigint NOT NULL,
    encounter_id character varying(255),
    source character varying(255) NOT NULL,
    priority character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    requested_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    patient_name character varying(255),
    specialty character varying(255),
    gender character varying(255),
    isolation boolean DEFAULT false NOT NULL
);
--
-- Name: bed_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.bed_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: bed_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bed_requests_id_seq OWNED BY public.bed_requests.id;
--
-- Name: beds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.beds (
    id bigint NOT NULL,
    ward_id bigint NOT NULL,
    room character varying(255) NOT NULL,
    bed_code character varying(255) NOT NULL,
    gender_policy character varying(255),
    isolation boolean DEFAULT false NOT NULL,
    status character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: beds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.beds_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: beds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.beds_id_seq OWNED BY public.beds.id;
--
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);
--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);
--
-- Name: care_activity_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.care_activity_completions (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    activity_label character varying(255) NOT NULL,
    completed_at timestamp(0) without time zone NOT NULL,
    completed_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: care_activity_completions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.care_activity_completions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: care_activity_completions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.care_activity_completions_id_seq OWNED BY public.care_activity_completions.id;
--
-- Name: cleaning_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cleaning_orders (
    id bigint NOT NULL,
    bed_id bigint NOT NULL,
    protocol character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    dispatched_at timestamp(0) without time zone NOT NULL,
    completed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: cleaning_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.cleaning_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: cleaning_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cleaning_orders_id_seq OWNED BY public.cleaning_orders.id;
--
-- Name: clinical_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.clinical_alerts (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    source character varying(255) NOT NULL,
    severity character varying(255) NOT NULL,
    news2_total smallint,
    message text NOT NULL,
    status character varying(255) NOT NULL,
    generated_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    assigned_role character varying(255),
    assigned_user_id bigint,
    created_by bigint,
    acknowledge_due_at timestamp(0) without time zone,
    medical_notified_at timestamp(0) without time zone,
    medical_due_at timestamp(0) without time zone,
    closed_at timestamp(0) without time zone,
    closure_note text,
    follow_up_due_at timestamp(0) without time zone,
    reassessed_at timestamp(0) without time zone,
    icu_ordered_at timestamp(0) without time zone,
    icu_doctor_authorized_at timestamp(0) without time zone,
    icu_doctor_authorized_by bigint,
    icu_nurse_authorized_at timestamp(0) without time zone,
    icu_nurse_authorized_by bigint,
    icu_transferred_at timestamp(0) without time zone,
    icu_returned_at timestamp(0) without time zone,
    icu_previous_room character varying(255),
    icu_previous_bed character varying(255),
    icu_previous_service character varying(255),
    compliance_key character varying(255)
);
--
-- Name: clinical_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.clinical_alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: clinical_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clinical_alerts_id_seq OWNED BY public.clinical_alerts.id;
--
-- Name: coverage_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.coverage_referrals (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    destination character varying(255) NOT NULL,
    relative_name character varying(255) NOT NULL,
    relative_phone character varying(255) NOT NULL,
    note text,
    status character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: coverage_referrals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.coverage_referrals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: coverage_referrals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coverage_referrals_id_seq OWNED BY public.coverage_referrals.id;
--
-- Name: coverage_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.coverage_requests (
    id bigint NOT NULL,
    absence_id bigint,
    status character varying(40) DEFAULT 'solicitada'::character varying NOT NULL,
    approved_by bigint,
    authorized_by_hr bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: coverage_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.coverage_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: coverage_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coverage_requests_id_seq OWNED BY public.coverage_requests.id;
--
-- Name: daily_patient_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.daily_patient_assignments (
    id bigint NOT NULL,
    shift_date date NOT NULL,
    nurse_user_id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    news2_weight smallint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: daily_patient_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.daily_patient_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: daily_patient_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_patient_assignments_id_seq OWNED BY public.daily_patient_assignments.id;
--
-- Name: discharge_indication_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.discharge_indication_receipts (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    received_by_name character varying(120) NOT NULL,
    received_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: discharge_indication_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.discharge_indication_receipts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: discharge_indication_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.discharge_indication_receipts_id_seq OWNED BY public.discharge_indication_receipts.id;
--
-- Name: discharge_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.discharge_orders (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    ordered_by bigint,
    ordered_at timestamp(0) without time zone NOT NULL,
    status character varying(40) DEFAULT 'registrada'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: discharge_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.discharge_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: discharge_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.discharge_orders_id_seq OWNED BY public.discharge_orders.id;
--
-- Name: discharge_projections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.discharge_projections (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    projected_at timestamp(0) without time zone NOT NULL,
    noted_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: discharge_projections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.discharge_projections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: discharge_projections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.discharge_projections_id_seq OWNED BY public.discharge_projections.id;
--
-- Name: epicrisis_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.epicrisis_documents (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    diagnoses text NOT NULL,
    procedures text,
    evolution text,
    authored_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: epicrisis_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.epicrisis_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: epicrisis_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.epicrisis_documents_id_seq OWNED BY public.epicrisis_documents.id;
--
-- Name: exit_passes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.exit_passes (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    issued_at timestamp(0) without time zone NOT NULL,
    status character varying(40) DEFAULT 'emitido'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: exit_passes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.exit_passes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: exit_passes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exit_passes_id_seq OWNED BY public.exit_passes.id;
--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;
--
-- Name: handovers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.handovers (
    id bigint NOT NULL,
    from_user_id bigint NOT NULL,
    to_user_id bigint NOT NULL,
    encounter_id character varying(255),
    payload json,
    signed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: handovers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.handovers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: handovers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.handovers_id_seq OWNED BY public.handovers.id;
--
-- Name: imaging_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.imaging_reports (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    external_id character varying(255),
    modality character varying(255),
    summary text NOT NULL,
    payload json,
    reported_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: imaging_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.imaging_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: imaging_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imaging_reports_id_seq OWNED BY public.imaging_reports.id;
--
-- Name: informed_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.informed_consents (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    signer_name character varying(255) NOT NULL,
    relationship character varying(255) NOT NULL,
    accepted_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: informed_consents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.informed_consents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: informed_consents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.informed_consents_id_seq OWNED BY public.informed_consents.id;
--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);
--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);
--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;
--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lab_results (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    external_id character varying(255),
    summary text NOT NULL,
    payload json,
    resulted_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: lab_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.lab_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: lab_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_results_id_seq OWNED BY public.lab_results.id;
--
-- Name: medical_evolution_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.medical_evolution_notes (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    author_user_id bigint,
    body text NOT NULL,
    signed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: medical_evolution_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.medical_evolution_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: medical_evolution_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_evolution_notes_id_seq OWNED BY public.medical_evolution_notes.id;
--
-- Name: medication_administrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.medication_administrations (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    prescription_item_id bigint,
    scheduled_at timestamp(0) without time zone NOT NULL,
    administered_at timestamp(0) without time zone,
    status character varying(255) NOT NULL,
    nurse_user_id bigint,
    barcode_ok boolean,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: medication_administrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.medication_administrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: medication_administrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medication_administrations_id_seq OWNED BY public.medication_administrations.id;
--
-- Name: medication_reconciliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.medication_reconciliations (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    allergies text,
    medications json,
    status character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: medication_reconciliations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.medication_reconciliations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: medication_reconciliations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medication_reconciliations_id_seq OWNED BY public.medication_reconciliations.id;
--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);
--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;
--
-- Name: monitoring_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.monitoring_schedules (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    next_due_at timestamp(0) without time zone NOT NULL,
    frequency_minutes integer NOT NULL,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: monitoring_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.monitoring_schedules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: monitoring_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monitoring_schedules_id_seq OWNED BY public.monitoring_schedules.id;
--
-- Name: nursing_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.nursing_assessments (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    chief_complaint text,
    history text,
    allergies json,
    recorded_by character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: nursing_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.nursing_assessments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: nursing_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_assessments_id_seq OWNED BY public.nursing_assessments.id;
--
-- Name: nursing_discharge_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.nursing_discharge_reports (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    instructions text NOT NULL,
    alarm_signs text,
    home_care text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: nursing_discharge_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.nursing_discharge_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: nursing_discharge_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_discharge_reports_id_seq OWNED BY public.nursing_discharge_reports.id;
--
-- Name: nursing_evolution_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.nursing_evolution_notes (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    author_user_id bigint,
    body text NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: nursing_evolution_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.nursing_evolution_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: nursing_evolution_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_evolution_notes_id_seq OWNED BY public.nursing_evolution_notes.id;
--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);
--
-- Name: patient_allergies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.patient_allergies (
    id bigint NOT NULL,
    patient_id bigint NOT NULL,
    substance character varying(255) NOT NULL,
    notes text,
    is_optional boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: patient_allergies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.patient_allergies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: patient_allergies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_allergies_id_seq OWNED BY public.patient_allergies.id;
--
-- Name: patient_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.patient_contacts (
    id bigint NOT NULL,
    patient_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(255) NOT NULL,
    relationship character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: patient_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.patient_contacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: patient_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_contacts_id_seq OWNED BY public.patient_contacts.id;
--
-- Name: patient_exits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.patient_exits (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    exited_at timestamp(0) without time zone NOT NULL,
    confirmed_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: patient_exits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.patient_exits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: patient_exits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_exits_id_seq OWNED BY public.patient_exits.id;
--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.patients (
    id bigint NOT NULL,
    document_type character varying(255) NOT NULL,
    document_number character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    birth_date date,
    sex character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.patients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;
--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;
--
-- Name: pharma_discharge_reconciliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pharma_discharge_reconciliations (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    notes text,
    status character varying(40) DEFAULT 'registrada'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: pharma_discharge_reconciliations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.pharma_discharge_reconciliations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: pharma_discharge_reconciliations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pharma_discharge_reconciliations_id_seq OWNED BY public.pharma_discharge_reconciliations.id;
--
-- Name: prescription_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.prescription_items (
    id bigint NOT NULL,
    prescription_id bigint NOT NULL,
    drug_name character varying(255) NOT NULL,
    dose character varying(255) NOT NULL,
    route character varying(255) NOT NULL,
    frequency character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: prescription_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.prescription_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: prescription_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prescription_items_id_seq OWNED BY public.prescription_items.id;
--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.prescriptions (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    prescribed_by bigint,
    signed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.prescriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prescriptions_id_seq OWNED BY public.prescriptions.id;
--
-- Name: retainer_confirmations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.retainer_confirmations (
    id bigint NOT NULL,
    coverage_request_id bigint NOT NULL,
    user_id bigint NOT NULL,
    confirmed_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: retainer_confirmations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.retainer_confirmations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: retainer_confirmations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.retainer_confirmations_id_seq OWNED BY public.retainer_confirmations.id;
--
-- Name: risk_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    morse_score smallint,
    braden_score smallint,
    recommendations text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: risk_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.risk_assessments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: risk_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_assessments_id_seq OWNED BY public.risk_assessments.id;
--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);
--
-- Name: social_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.social_assessments (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    report text NOT NULL,
    validated boolean DEFAULT false NOT NULL,
    assessed_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: social_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.social_assessments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: social_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.social_assessments_id_seq OWNED BY public.social_assessments.id;
--
-- Name: staff_absences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.staff_absences (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    shift_date date NOT NULL,
    reason character varying(255),
    recorded_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: staff_absences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.staff_absences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: staff_absences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_absences_id_seq OWNED BY public.staff_absences.id;
--
-- Name: staff_shift_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.staff_shift_plans (
    id bigint NOT NULL,
    year_month character varying(7) NOT NULL,
    published_at timestamp(0) without time zone,
    published_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: staff_shift_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.staff_shift_plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: staff_shift_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_shift_plans_id_seq OWNED BY public.staff_shift_plans.id;
--
-- Name: staff_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.staff_shifts (
    id bigint NOT NULL,
    plan_id bigint,
    user_id bigint NOT NULL,
    starts_at timestamp(0) without time zone NOT NULL,
    ends_at timestamp(0) without time zone NOT NULL,
    unit character varying(80),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: staff_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.staff_shifts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: staff_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_shifts_id_seq OWNED BY public.staff_shifts.id;
--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    role character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deactivated_at timestamp(0) without time zone
);
--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
--
-- Name: vital_sign_readings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.vital_sign_readings (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    rr smallint,
    spo2 smallint,
    sbp smallint,
    pulse smallint,
    temperature numeric(4,1),
    spo2_scale character varying(255),
    supplemental_oxygen boolean,
    consciousness character varying(255),
    news2_total smallint,
    recorded_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    dbp smallint
);
--
-- Name: vital_sign_readings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.vital_sign_readings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: vital_sign_readings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vital_sign_readings_id_seq OWNED BY public.vital_sign_readings.id;
--
-- Name: wards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wards (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    specialty character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: wards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.wards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: wards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wards_id_seq OWNED BY public.wards.id;
--
-- Name: wristband_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wristband_events (
    id bigint NOT NULL,
    encounter_id character varying(255) NOT NULL,
    code character varying(255) NOT NULL,
    action character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);
--
-- Name: wristband_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.wristband_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: wristband_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wristband_events_id_seq OWNED BY public.wristband_events.id;
--
-- Name: account_verifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_verifications ALTER COLUMN id SET DEFAULT nextval('public.account_verifications_id_seq'::regclass);
--
-- Name: admission_encounters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_encounters ALTER COLUMN id SET DEFAULT nextval('public.admission_encounters_id_seq'::regclass);
--
-- Name: alert_acknowledgements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_acknowledgements ALTER COLUMN id SET DEFAULT nextval('public.alert_acknowledgements_id_seq'::regclass);
--
-- Name: alert_escalations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_escalations ALTER COLUMN id SET DEFAULT nextval('public.alert_escalations_id_seq'::regclass);
--
-- Name: alert_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_events ALTER COLUMN id SET DEFAULT nextval('public.alert_events_id_seq'::regclass);
--
-- Name: ambulatory_prescriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ambulatory_prescriptions ALTER COLUMN id SET DEFAULT nextval('public.ambulatory_prescriptions_id_seq'::regclass);
--
-- Name: bed_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_assignments ALTER COLUMN id SET DEFAULT nextval('public.bed_assignments_id_seq'::regclass);
--
-- Name: bed_readiness_checks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_readiness_checks ALTER COLUMN id SET DEFAULT nextval('public.bed_readiness_checks_id_seq'::regclass);
--
-- Name: bed_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_requests ALTER COLUMN id SET DEFAULT nextval('public.bed_requests_id_seq'::regclass);
--
-- Name: beds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beds ALTER COLUMN id SET DEFAULT nextval('public.beds_id_seq'::regclass);
--
-- Name: care_activity_completions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_activity_completions ALTER COLUMN id SET DEFAULT nextval('public.care_activity_completions_id_seq'::regclass);
--
-- Name: cleaning_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaning_orders ALTER COLUMN id SET DEFAULT nextval('public.cleaning_orders_id_seq'::regclass);
--
-- Name: clinical_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_alerts ALTER COLUMN id SET DEFAULT nextval('public.clinical_alerts_id_seq'::regclass);
--
-- Name: coverage_referrals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverage_referrals ALTER COLUMN id SET DEFAULT nextval('public.coverage_referrals_id_seq'::regclass);
--
-- Name: coverage_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverage_requests ALTER COLUMN id SET DEFAULT nextval('public.coverage_requests_id_seq'::regclass);
--
-- Name: daily_patient_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_patient_assignments ALTER COLUMN id SET DEFAULT nextval('public.daily_patient_assignments_id_seq'::regclass);
--
-- Name: discharge_indication_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discharge_indication_receipts ALTER COLUMN id SET DEFAULT nextval('public.discharge_indication_receipts_id_seq'::regclass);
--
-- Name: discharge_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discharge_orders ALTER COLUMN id SET DEFAULT nextval('public.discharge_orders_id_seq'::regclass);
--
-- Name: discharge_projections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discharge_projections ALTER COLUMN id SET DEFAULT nextval('public.discharge_projections_id_seq'::regclass);
--
-- Name: epicrisis_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epicrisis_documents ALTER COLUMN id SET DEFAULT nextval('public.epicrisis_documents_id_seq'::regclass);
--
-- Name: exit_passes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exit_passes ALTER COLUMN id SET DEFAULT nextval('public.exit_passes_id_seq'::regclass);
--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);
--
-- Name: handovers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handovers ALTER COLUMN id SET DEFAULT nextval('public.handovers_id_seq'::regclass);
--
-- Name: imaging_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_reports ALTER COLUMN id SET DEFAULT nextval('public.imaging_reports_id_seq'::regclass);
--
-- Name: informed_consents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informed_consents ALTER COLUMN id SET DEFAULT nextval('public.informed_consents_id_seq'::regclass);
--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);
--
-- Name: lab_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results ALTER COLUMN id SET DEFAULT nextval('public.lab_results_id_seq'::regclass);
--
-- Name: medical_evolution_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_evolution_notes ALTER COLUMN id SET DEFAULT nextval('public.medical_evolution_notes_id_seq'::regclass);
--
-- Name: medication_administrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administrations ALTER COLUMN id SET DEFAULT nextval('public.medication_administrations_id_seq'::regclass);
--
-- Name: medication_reconciliations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_reconciliations ALTER COLUMN id SET DEFAULT nextval('public.medication_reconciliations_id_seq'::regclass);
--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);
--
-- Name: monitoring_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_schedules ALTER COLUMN id SET DEFAULT nextval('public.monitoring_schedules_id_seq'::regclass);
--
-- Name: nursing_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_assessments ALTER COLUMN id SET DEFAULT nextval('public.nursing_assessments_id_seq'::regclass);
--
-- Name: nursing_discharge_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_discharge_reports ALTER COLUMN id SET DEFAULT nextval('public.nursing_discharge_reports_id_seq'::regclass);
--
-- Name: nursing_evolution_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_evolution_notes ALTER COLUMN id SET DEFAULT nextval('public.nursing_evolution_notes_id_seq'::regclass);
--
-- Name: patient_allergies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_allergies ALTER COLUMN id SET DEFAULT nextval('public.patient_allergies_id_seq'::regclass);
--
-- Name: patient_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_contacts ALTER COLUMN id SET DEFAULT nextval('public.patient_contacts_id_seq'::regclass);
--
-- Name: patient_exits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_exits ALTER COLUMN id SET DEFAULT nextval('public.patient_exits_id_seq'::regclass);
--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);
--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);
--
-- Name: pharma_discharge_reconciliations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharma_discharge_reconciliations ALTER COLUMN id SET DEFAULT nextval('public.pharma_discharge_reconciliations_id_seq'::regclass);
--
-- Name: prescription_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items ALTER COLUMN id SET DEFAULT nextval('public.prescription_items_id_seq'::regclass);
--
-- Name: prescriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions ALTER COLUMN id SET DEFAULT nextval('public.prescriptions_id_seq'::regclass);
--
-- Name: retainer_confirmations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retainer_confirmations ALTER COLUMN id SET DEFAULT nextval('public.retainer_confirmations_id_seq'::regclass);
--
-- Name: risk_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments ALTER COLUMN id SET DEFAULT nextval('public.risk_assessments_id_seq'::regclass);
--
-- Name: social_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_assessments ALTER COLUMN id SET DEFAULT nextval('public.social_assessments_id_seq'::regclass);
--
-- Name: staff_absences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_absences ALTER COLUMN id SET DEFAULT nextval('public.staff_absences_id_seq'::regclass);
--
-- Name: staff_shift_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shift_plans ALTER COLUMN id SET DEFAULT nextval('public.staff_shift_plans_id_seq'::regclass);
--
-- Name: staff_shifts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts ALTER COLUMN id SET DEFAULT nextval('public.staff_shifts_id_seq'::regclass);
--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
--
-- Name: vital_sign_readings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_sign_readings ALTER COLUMN id SET DEFAULT nextval('public.vital_sign_readings_id_seq'::regclass);
--
-- Name: wards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wards ALTER COLUMN id SET DEFAULT nextval('public.wards_id_seq'::regclass);
--
-- Name: wristband_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wristband_events ALTER COLUMN id SET DEFAULT nextval('public.wristband_events_id_seq'::regclass);
DO $$
BEGIN
    --
    -- Name: account_verifications account_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.account_verifications
        ADD CONSTRAINT account_verifications_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: admission_encounters admission_encounters_encounter_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.admission_encounters
        ADD CONSTRAINT admission_encounters_encounter_id_unique UNIQUE (encounter_id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: admission_encounters admission_encounters_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.admission_encounters
        ADD CONSTRAINT admission_encounters_order_number_unique UNIQUE (order_number);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: admission_encounters admission_encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.admission_encounters
        ADD CONSTRAINT admission_encounters_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: alert_acknowledgements alert_acknowledgements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.alert_acknowledgements
        ADD CONSTRAINT alert_acknowledgements_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: alert_escalations alert_escalations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.alert_escalations
        ADD CONSTRAINT alert_escalations_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: alert_events alert_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.alert_events
        ADD CONSTRAINT alert_events_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: ambulatory_prescriptions ambulatory_prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.ambulatory_prescriptions
        ADD CONSTRAINT ambulatory_prescriptions_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: bed_assignments bed_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.bed_assignments
        ADD CONSTRAINT bed_assignments_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: bed_readiness_checks bed_readiness_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.bed_readiness_checks
        ADD CONSTRAINT bed_readiness_checks_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: bed_requests bed_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.bed_requests
        ADD CONSTRAINT bed_requests_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: beds beds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.beds
        ADD CONSTRAINT beds_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: beds beds_ward_id_room_bed_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.beds
        ADD CONSTRAINT beds_ward_id_room_bed_code_unique UNIQUE (ward_id, room, bed_code);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.cache_locks
        ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.cache
        ADD CONSTRAINT cache_pkey PRIMARY KEY (key);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: care_activity_completions care_activity_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.care_activity_completions
        ADD CONSTRAINT care_activity_completions_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: cleaning_orders cleaning_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.cleaning_orders
        ADD CONSTRAINT cleaning_orders_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: clinical_alerts clinical_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.clinical_alerts
        ADD CONSTRAINT clinical_alerts_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: coverage_referrals coverage_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.coverage_referrals
        ADD CONSTRAINT coverage_referrals_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: coverage_requests coverage_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.coverage_requests
        ADD CONSTRAINT coverage_requests_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: daily_patient_assignments daily_patient_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.daily_patient_assignments
        ADD CONSTRAINT daily_patient_assignments_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: discharge_indication_receipts discharge_indication_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.discharge_indication_receipts
        ADD CONSTRAINT discharge_indication_receipts_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: discharge_orders discharge_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.discharge_orders
        ADD CONSTRAINT discharge_orders_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: discharge_projections discharge_projections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.discharge_projections
        ADD CONSTRAINT discharge_projections_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: epicrisis_documents epicrisis_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.epicrisis_documents
        ADD CONSTRAINT epicrisis_documents_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: exit_passes exit_passes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.exit_passes
        ADD CONSTRAINT exit_passes_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.failed_jobs
        ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.failed_jobs
        ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: handovers handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.handovers
        ADD CONSTRAINT handovers_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: imaging_reports imaging_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.imaging_reports
        ADD CONSTRAINT imaging_reports_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: informed_consents informed_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.informed_consents
        ADD CONSTRAINT informed_consents_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.job_batches
        ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.jobs
        ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.lab_results
        ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: medical_evolution_notes medical_evolution_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.medical_evolution_notes
        ADD CONSTRAINT medical_evolution_notes_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: medication_administrations medication_administrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.medication_administrations
        ADD CONSTRAINT medication_administrations_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: medication_reconciliations medication_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.medication_reconciliations
        ADD CONSTRAINT medication_reconciliations_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.migrations
        ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: monitoring_schedules monitoring_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.monitoring_schedules
        ADD CONSTRAINT monitoring_schedules_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: nursing_assessments nursing_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.nursing_assessments
        ADD CONSTRAINT nursing_assessments_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: nursing_discharge_reports nursing_discharge_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.nursing_discharge_reports
        ADD CONSTRAINT nursing_discharge_reports_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: nursing_evolution_notes nursing_evolution_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.nursing_evolution_notes
        ADD CONSTRAINT nursing_evolution_notes_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.password_reset_tokens
        ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: patient_allergies patient_allergies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.patient_allergies
        ADD CONSTRAINT patient_allergies_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: patient_contacts patient_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.patient_contacts
        ADD CONSTRAINT patient_contacts_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: patient_exits patient_exits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.patient_exits
        ADD CONSTRAINT patient_exits_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: patients patients_document_type_document_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.patients
        ADD CONSTRAINT patients_document_type_document_number_unique UNIQUE (document_type, document_number);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.patients
        ADD CONSTRAINT patients_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.personal_access_tokens
        ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.personal_access_tokens
        ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: pharma_discharge_reconciliations pharma_discharge_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.pharma_discharge_reconciliations
        ADD CONSTRAINT pharma_discharge_reconciliations_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: prescription_items prescription_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.prescription_items
        ADD CONSTRAINT prescription_items_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.prescriptions
        ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: retainer_confirmations retainer_confirmations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.retainer_confirmations
        ADD CONSTRAINT retainer_confirmations_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: risk_assessments risk_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.risk_assessments
        ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.sessions
        ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: social_assessments social_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.social_assessments
        ADD CONSTRAINT social_assessments_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: staff_absences staff_absences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.staff_absences
        ADD CONSTRAINT staff_absences_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: staff_shift_plans staff_shift_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.staff_shift_plans
        ADD CONSTRAINT staff_shift_plans_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: staff_shift_plans staff_shift_plans_year_month_unique; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.staff_shift_plans
        ADD CONSTRAINT staff_shift_plans_year_month_unique UNIQUE (year_month);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: staff_shifts staff_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.staff_shifts
        ADD CONSTRAINT staff_shifts_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.users
        ADD CONSTRAINT users_email_unique UNIQUE (email);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.users
        ADD CONSTRAINT users_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: vital_sign_readings vital_sign_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.vital_sign_readings
        ADD CONSTRAINT vital_sign_readings_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: wards wards_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.wards
        ADD CONSTRAINT wards_code_unique UNIQUE (code);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: wards wards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.wards
        ADD CONSTRAINT wards_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: wristband_events wristband_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.wristband_events
        ADD CONSTRAINT wristband_events_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
--
-- Name: account_verifications_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS account_verifications_encounter_id_index ON public.account_verifications USING btree (encounter_id);
--
-- Name: alert_events_alert_id_occurred_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS alert_events_alert_id_occurred_at_index ON public.alert_events USING btree (alert_id, occurred_at);
--
-- Name: ambulatory_prescriptions_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS ambulatory_prescriptions_encounter_id_index ON public.ambulatory_prescriptions USING btree (encounter_id);
--
-- Name: bed_assignments_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS bed_assignments_encounter_id_index ON public.bed_assignments USING btree (encounter_id);
--
-- Name: bed_requests_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS bed_requests_encounter_id_index ON public.bed_requests USING btree (encounter_id);
--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS cache_expiration_index ON public.cache USING btree (expiration);
--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS cache_locks_expiration_index ON public.cache_locks USING btree (expiration);
--
-- Name: care_activity_completions_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS care_activity_completions_encounter_id_index ON public.care_activity_completions USING btree (encounter_id);
--
-- Name: clinical_alerts_compliance_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS clinical_alerts_compliance_key_index ON public.clinical_alerts USING btree (compliance_key);
--
-- Name: clinical_alerts_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS clinical_alerts_encounter_id_index ON public.clinical_alerts USING btree (encounter_id);
--
-- Name: coverage_referrals_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS coverage_referrals_encounter_id_index ON public.coverage_referrals USING btree (encounter_id);
--
-- Name: daily_patient_assignments_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS daily_patient_assignments_encounter_id_index ON public.daily_patient_assignments USING btree (encounter_id);
--
-- Name: discharge_indication_receipts_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS discharge_indication_receipts_encounter_id_index ON public.discharge_indication_receipts USING btree (encounter_id);
--
-- Name: discharge_orders_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS discharge_orders_encounter_id_index ON public.discharge_orders USING btree (encounter_id);
--
-- Name: discharge_projections_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS discharge_projections_encounter_id_index ON public.discharge_projections USING btree (encounter_id);
--
-- Name: epicrisis_documents_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS epicrisis_documents_encounter_id_index ON public.epicrisis_documents USING btree (encounter_id);
--
-- Name: exit_passes_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS exit_passes_encounter_id_index ON public.exit_passes USING btree (encounter_id);
--
-- Name: handovers_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS handovers_encounter_id_index ON public.handovers USING btree (encounter_id);
--
-- Name: imaging_reports_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS imaging_reports_encounter_id_index ON public.imaging_reports USING btree (encounter_id);
--
-- Name: informed_consents_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS informed_consents_encounter_id_index ON public.informed_consents USING btree (encounter_id);
--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS jobs_queue_index ON public.jobs USING btree (queue);
--
-- Name: lab_results_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS lab_results_encounter_id_index ON public.lab_results USING btree (encounter_id);
--
-- Name: medical_evolution_notes_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS medical_evolution_notes_encounter_id_index ON public.medical_evolution_notes USING btree (encounter_id);
--
-- Name: medication_administrations_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS medication_administrations_encounter_id_index ON public.medication_administrations USING btree (encounter_id);
--
-- Name: medication_reconciliations_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS medication_reconciliations_encounter_id_index ON public.medication_reconciliations USING btree (encounter_id);
--
-- Name: monitoring_schedules_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS monitoring_schedules_encounter_id_index ON public.monitoring_schedules USING btree (encounter_id);
--
-- Name: nursing_assessments_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS nursing_assessments_encounter_id_index ON public.nursing_assessments USING btree (encounter_id);
--
-- Name: nursing_discharge_reports_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS nursing_discharge_reports_encounter_id_index ON public.nursing_discharge_reports USING btree (encounter_id);
--
-- Name: nursing_evolution_notes_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS nursing_evolution_notes_encounter_id_index ON public.nursing_evolution_notes USING btree (encounter_id);
--
-- Name: patient_exits_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS patient_exits_encounter_id_index ON public.patient_exits USING btree (encounter_id);
--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);
--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);
--
-- Name: pharma_discharge_reconciliations_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS pharma_discharge_reconciliations_encounter_id_index ON public.pharma_discharge_reconciliations USING btree (encounter_id);
--
-- Name: prescriptions_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS prescriptions_encounter_id_index ON public.prescriptions USING btree (encounter_id);
--
-- Name: risk_assessments_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS risk_assessments_encounter_id_index ON public.risk_assessments USING btree (encounter_id);
--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS sessions_last_activity_index ON public.sessions USING btree (last_activity);
--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS sessions_user_id_index ON public.sessions USING btree (user_id);
--
-- Name: social_assessments_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS social_assessments_encounter_id_index ON public.social_assessments USING btree (encounter_id);
--
-- Name: vital_sign_readings_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS vital_sign_readings_encounter_id_index ON public.vital_sign_readings USING btree (encounter_id);
--
-- Name: wristband_events_encounter_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS wristband_events_encounter_id_index ON public.wristband_events USING btree (encounter_id);
DO $$
BEGIN
    --
    -- Name: alert_acknowledgements alert_acknowledgements_alert_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.alert_acknowledgements
        ADD CONSTRAINT alert_acknowledgements_alert_id_foreign FOREIGN KEY (alert_id) REFERENCES public.clinical_alerts(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: alert_acknowledgements alert_acknowledgements_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.alert_acknowledgements
        ADD CONSTRAINT alert_acknowledgements_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: alert_escalations alert_escalations_alert_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.alert_escalations
        ADD CONSTRAINT alert_escalations_alert_id_foreign FOREIGN KEY (alert_id) REFERENCES public.clinical_alerts(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: alert_events alert_events_alert_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.alert_events
        ADD CONSTRAINT alert_events_alert_id_foreign FOREIGN KEY (alert_id) REFERENCES public.clinical_alerts(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: alert_events alert_events_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.alert_events
        ADD CONSTRAINT alert_events_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: bed_assignments bed_assignments_bed_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.bed_assignments
        ADD CONSTRAINT bed_assignments_bed_id_foreign FOREIGN KEY (bed_id) REFERENCES public.beds(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: bed_readiness_checks bed_readiness_checks_bed_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.bed_readiness_checks
        ADD CONSTRAINT bed_readiness_checks_bed_id_foreign FOREIGN KEY (bed_id) REFERENCES public.beds(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: bed_readiness_checks bed_readiness_checks_confirmed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.bed_readiness_checks
        ADD CONSTRAINT bed_readiness_checks_confirmed_by_foreign FOREIGN KEY (confirmed_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: beds beds_ward_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.beds
        ADD CONSTRAINT beds_ward_id_foreign FOREIGN KEY (ward_id) REFERENCES public.wards(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: care_activity_completions care_activity_completions_completed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.care_activity_completions
        ADD CONSTRAINT care_activity_completions_completed_by_foreign FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: cleaning_orders cleaning_orders_bed_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.cleaning_orders
        ADD CONSTRAINT cleaning_orders_bed_id_foreign FOREIGN KEY (bed_id) REFERENCES public.beds(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: clinical_alerts clinical_alerts_assigned_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.clinical_alerts
        ADD CONSTRAINT clinical_alerts_assigned_user_id_foreign FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: clinical_alerts clinical_alerts_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.clinical_alerts
        ADD CONSTRAINT clinical_alerts_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: clinical_alerts clinical_alerts_icu_doctor_authorized_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.clinical_alerts
        ADD CONSTRAINT clinical_alerts_icu_doctor_authorized_by_foreign FOREIGN KEY (icu_doctor_authorized_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: clinical_alerts clinical_alerts_icu_nurse_authorized_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.clinical_alerts
        ADD CONSTRAINT clinical_alerts_icu_nurse_authorized_by_foreign FOREIGN KEY (icu_nurse_authorized_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: coverage_requests coverage_requests_absence_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.coverage_requests
        ADD CONSTRAINT coverage_requests_absence_id_foreign FOREIGN KEY (absence_id) REFERENCES public.staff_absences(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: coverage_requests coverage_requests_approved_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.coverage_requests
        ADD CONSTRAINT coverage_requests_approved_by_foreign FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: coverage_requests coverage_requests_authorized_by_hr_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.coverage_requests
        ADD CONSTRAINT coverage_requests_authorized_by_hr_foreign FOREIGN KEY (authorized_by_hr) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: daily_patient_assignments daily_patient_assignments_nurse_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.daily_patient_assignments
        ADD CONSTRAINT daily_patient_assignments_nurse_user_id_foreign FOREIGN KEY (nurse_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: discharge_orders discharge_orders_ordered_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.discharge_orders
        ADD CONSTRAINT discharge_orders_ordered_by_foreign FOREIGN KEY (ordered_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: discharge_projections discharge_projections_noted_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.discharge_projections
        ADD CONSTRAINT discharge_projections_noted_by_foreign FOREIGN KEY (noted_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: epicrisis_documents epicrisis_documents_authored_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.epicrisis_documents
        ADD CONSTRAINT epicrisis_documents_authored_by_foreign FOREIGN KEY (authored_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: handovers handovers_from_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.handovers
        ADD CONSTRAINT handovers_from_user_id_foreign FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: handovers handovers_to_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.handovers
        ADD CONSTRAINT handovers_to_user_id_foreign FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: medical_evolution_notes medical_evolution_notes_author_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.medical_evolution_notes
        ADD CONSTRAINT medical_evolution_notes_author_user_id_foreign FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: medication_administrations medication_administrations_nurse_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.medication_administrations
        ADD CONSTRAINT medication_administrations_nurse_user_id_foreign FOREIGN KEY (nurse_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: medication_administrations medication_administrations_prescription_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.medication_administrations
        ADD CONSTRAINT medication_administrations_prescription_item_id_foreign FOREIGN KEY (prescription_item_id) REFERENCES public.prescription_items(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: monitoring_schedules monitoring_schedules_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.monitoring_schedules
        ADD CONSTRAINT monitoring_schedules_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: nursing_evolution_notes nursing_evolution_notes_author_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.nursing_evolution_notes
        ADD CONSTRAINT nursing_evolution_notes_author_user_id_foreign FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: patient_allergies patient_allergies_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.patient_allergies
        ADD CONSTRAINT patient_allergies_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: patient_contacts patient_contacts_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.patient_contacts
        ADD CONSTRAINT patient_contacts_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: patient_exits patient_exits_confirmed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.patient_exits
        ADD CONSTRAINT patient_exits_confirmed_by_foreign FOREIGN KEY (confirmed_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: prescription_items prescription_items_prescription_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.prescription_items
        ADD CONSTRAINT prescription_items_prescription_id_foreign FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: prescriptions prescriptions_prescribed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.prescriptions
        ADD CONSTRAINT prescriptions_prescribed_by_foreign FOREIGN KEY (prescribed_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: retainer_confirmations retainer_confirmations_coverage_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.retainer_confirmations
        ADD CONSTRAINT retainer_confirmations_coverage_request_id_foreign FOREIGN KEY (coverage_request_id) REFERENCES public.coverage_requests(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: retainer_confirmations retainer_confirmations_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.retainer_confirmations
        ADD CONSTRAINT retainer_confirmations_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: social_assessments social_assessments_assessed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.social_assessments
        ADD CONSTRAINT social_assessments_assessed_by_foreign FOREIGN KEY (assessed_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: staff_absences staff_absences_recorded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.staff_absences
        ADD CONSTRAINT staff_absences_recorded_by_foreign FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: staff_absences staff_absences_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.staff_absences
        ADD CONSTRAINT staff_absences_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: staff_shift_plans staff_shift_plans_published_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.staff_shift_plans
        ADD CONSTRAINT staff_shift_plans_published_by_foreign FOREIGN KEY (published_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: staff_shifts staff_shifts_plan_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.staff_shifts
        ADD CONSTRAINT staff_shifts_plan_id_foreign FOREIGN KEY (plan_id) REFERENCES public.staff_shift_plans(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
DO $$
BEGIN
    --
    -- Name: staff_shifts staff_shifts_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.staff_shifts
        ADD CONSTRAINT staff_shifts_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;
--
-- PostgreSQL database dump complete
--;
