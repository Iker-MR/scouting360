from datetime import date

from django.contrib.auth import get_user_model

from .models import Jugador


def crear_jugador(username="jugador1"):
    usuario = get_user_model().objects.create_user(username=username, password="x")
    return Jugador.objects.create(
        usuario=usuario,
        nombre="Test",
        fecha_nacimiento=date(2005, 1, 1),
        posicion=Jugador.Posicion.DELANTERO,
        pierna_dominante=Jugador.Pierna.DIESTRA,
        zona="Madrid",
    )
