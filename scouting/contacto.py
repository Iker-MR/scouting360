from django.db import IntegrityError, transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Conversacion, Mensaje, Ojeador

# Lifetime quota: conversations started, never reset.
CUPO_GRATIS = 3
MAYORIA_DE_EDAD = 18

SOLO_OJEADORES = "Solo un ojeador puede iniciar una conversación."
YA_EXISTE = "Ya tenés una conversación con este jugador."
REQUIERE_VERIFICACION = "Tenés que estar verificado para contactar a un menor."
CUPO_AGOTADO = "Agotaste las conversaciones del plan gratis."


def iniciar_conversacion(usuario, jugador, texto):
    """Starts a scout -> player conversation with its first message.

    The business rules live here, not in the view, so they can be reused and
    read in one place. The scout row is locked so two concurrent requests
    cannot both see "2 of 3 used" and end up with 4 conversations.
    """
    ojeador = Ojeador.objects.filter(usuario=usuario).first()
    if ojeador is None:
        raise PermissionDenied(SOLO_OJEADORES)

    try:
        with transaction.atomic():
            ojeador = Ojeador.objects.select_for_update().get(pk=ojeador.pk)
            if Conversacion.objects.filter(ojeador=ojeador, jugador=jugador).exists():
                raise ValidationError({"jugador": YA_EXISTE})
            if jugador.edad() < MAYORIA_DE_EDAD and not ojeador.verificado:
                raise PermissionDenied(REQUIERE_VERIFICACION, code="requiere_verificacion")
            if ojeador.plan == Ojeador.Plan.GRATIS and ojeador.conversaciones.count() >= CUPO_GRATIS:
                raise PermissionDenied(CUPO_AGOTADO, code="cupo_agotado")
            conversacion = Conversacion.objects.create(ojeador=ojeador, jugador=jugador)
            Mensaje.objects.create(conversacion=conversacion, autor=usuario, texto=texto)
    except IntegrityError:
        # Safety net: the unique (ojeador, jugador) constraint is the source of truth.
        raise ValidationError({"jugador": YA_EXISTE})
    return conversacion
