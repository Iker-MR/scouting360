from rest_framework.exceptions import ErrorDetail
from rest_framework.views import exception_handler


def exception_handler_con_codigo(exc, context):
    """DRF's handler, plus the error code in the JSON body.

    DRF keeps the code only on the Python ErrorDetail; the rendered JSON is
    just {"detail": "..."}. The frontend needs the code to tell apart errors
    such as "cupo_agotado" and "requiere_verificacion" without matching text.
    Field validation errors (400 keyed by field) are left untouched.
    """
    response = exception_handler(exc, context)
    if response is None:
        return None
    detail = response.data.get("detail") if isinstance(response.data, dict) else None
    if isinstance(detail, ErrorDetail):
        response.data["code"] = detail.code
    return response
