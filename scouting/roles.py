from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError

from .models import Jugador, Ojeador

# Every profile model is a role; a user may hold at most one of them.
PERFILES = (Jugador, Ojeador)

YA_TIENE_PERFIL = "Este usuario ya tiene este perfil."
YA_TIENE_OTRO_ROL = "Este usuario ya tiene otro rol."


def guardar_perfil_exclusivo(serializer, usuario):
    """Saves a new profile for `usuario`, enforcing one role per user.

    A unique constraint cannot span two tables, so the rule lives here.
    Locking the user row serializes concurrent profile creations for the
    same user: the second request waits and then sees the first profile.
    """
    modelo = serializer.Meta.model
    otros = [perfil for perfil in PERFILES if perfil is not modelo]
    try:
        with transaction.atomic():
            get_user_model().objects.select_for_update().get(pk=usuario.pk)
            if any(perfil.objects.filter(usuario=usuario).exists() for perfil in otros):
                raise ValidationError({"usuario": YA_TIENE_OTRO_ROL})
            serializer.save(usuario=usuario)
    except IntegrityError:
        # Same role twice: the OneToOne unique constraint is the source of truth.
        raise ValidationError({"usuario": YA_TIENE_PERFIL})
