from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from .models import Atributos, Jugador


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


class AtributosTests(TestCase):
    def test_overall_es_none_sin_atributos(self):
        jugador = crear_jugador()

        self.assertIsNone(jugador.overall)

    def test_overall_es_la_media_redondeada_de_los_atributos(self):
        jugador = crear_jugador()
        Atributos.objects.create(
            jugador=jugador, ritmo=80, tiro=75, pase=70, regate=85, defensa=40, fisico=65
        )
        jugador.refresh_from_db()

        self.assertEqual(jugador.overall, 69)  # 415 / 6 = 69.17

    def test_atributos_por_defecto_valen_50(self):
        atributos = Atributos.objects.create(jugador=crear_jugador())

        self.assertEqual(atributos.ritmo, 50)
        self.assertEqual(atributos.fisico, 50)

    def test_atributo_fuera_de_rango_no_valida(self):
        jugador = crear_jugador()

        for valor in (-1, 100):
            with self.subTest(valor=valor):
                atributos = Atributos(jugador=jugador, ritmo=valor)
                with self.assertRaises(ValidationError):
                    atributos.full_clean()

    def test_limites_del_rango_validan(self):
        jugador = crear_jugador()

        for valor in (0, 99):
            with self.subTest(valor=valor):
                Atributos(jugador=jugador, ritmo=valor).full_clean()

    def test_borrar_jugador_borra_sus_atributos(self):
        jugador = crear_jugador()
        Atributos.objects.create(jugador=jugador)

        jugador.delete()

        self.assertFalse(Atributos.objects.exists())
