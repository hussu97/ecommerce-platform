"""Optional OpenTelemetry tracing. Set OTEL_EXPORTER_OTLP_ENDPOINT to export traces (e.g. Jaeger)."""
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

try:
    from opentelemetry.propagate import set_global_textmap
    from opentelemetry.propagators.otlp.otlp_trace_propagator import OTLPTraceContextPropagator
    _HAS_PROPAGATOR = True
except ImportError:
    _HAS_PROPAGATOR = False


def init_telemetry(app):  # noqa: ANN001
    """Initialize TracerProvider, W3C propagation, optional OTLP export, and FastAPI instrumentation."""
    service_name = os.environ.get("OTEL_SERVICE_NAME", "customer-api")
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)

    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()
    if endpoint:
        exporter = OTLPSpanExporter(endpoint=f"{endpoint.rstrip('/')}/v1/traces")
        provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)
    if _HAS_PROPAGATOR:
        set_global_textmap(OTLPTraceContextPropagator())

    FastAPIInstrumentor.instrument_app(app, excluded_urls="health,/")
    return provider
