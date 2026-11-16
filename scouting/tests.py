from datetime import date

from django.contrib.auth import get_user_model

from .models import Jugador, Ojeador


def crear_ojeador(username="ojeador1"):
    usuario = get_user_model().objects.create_user(username=username, password="x")
    return Ojeador.objects.create(
        usuario=usuario, nombre="Test", organizacion="CD Ejemplo"
    )


def crear_jugador(username="jugador1", **campos):
    usuario = get_user_model().objects.create_user(username=username, password="x")
    datos = {
        "nombre": "Test",
        "fecha_nacimiento": date(2005, 1, 1),
        "posicion": Jugador.Posicion.DELANTERO,
        "pierna_dominante": Jugador.Pierna.DIESTRA,
        "zona": "Madrid",
        **campos,
    }
    return Jugador.objects.create(usuario=usuario, **datos)
