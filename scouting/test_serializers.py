from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Atributos, Jugador
from .serializers import JugadorSerializer
from .tests import crear_jugador

ATRIBUTOS = {"ritmo": 80, "tiro": 75, "pase": 70, "regate": 85, "defensa": 40, "fisico": 65}

DATOS_JUGADOR = {
    "nombre": "Nuevo",
    "fecha_nacimiento": "2006-05-10",
    "posicion": "EI",
    "pierna_dominante": "I",
    "zona": "Bilbao",
}


class JugadorSerializerLecturaTests(TestCase):
    def test_incluye_atributos_anidados_y_overall(self):
        jugador = crear_jugador()
        Atributos.objects.create(jugador=jugador, **ATRIBUTOS)

        data = JugadorSerializer(jugador).data

        self.assertEqual(data["atributos"], ATRIBUTOS)
        self.assertEqual(data["overall"], 69)

    def test_sin_atributos_devuelve_null(self):
        data = JugadorSerializer(crear_jugador()).data

        self.assertIsNone(data["atributos"])
        self.assertIsNone(data["overall"])

    def test_incluye_nombre_legible_de_la_posicion(self):
        data = JugadorSerializer(crear_jugador()).data

        self.assertEqual(data["posicion"], "DL")
        self.assertEqual(data["posicion_display"], "Delantero centro")


class JugadorSerializerEscrituraTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(username="nuevo", password="x")

    def test_crea_jugador_con_atributos(self):
        serializer = JugadorSerializer(data={**DATOS_JUGADOR, "atributos": ATRIBUTOS})
        self.assertTrue(serializer.is_valid(), serializer.errors)

        jugador = serializer.save(usuario=self.usuario)

        self.assertEqual(jugador.atributos.regate, 85)
        self.assertEqual(jugador.overall, 69)

    def test_crea_jugador_sin_atributos(self):
        serializer = JugadorSerializer(data=DATOS_JUGADOR)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        jugador = serializer.save(usuario=self.usuario)

        self.assertFalse(Atributos.objects.filter(jugador=jugador).exists())

    def test_rechaza_atributo_fuera_de_rango(self):
        serializer = JugadorSerializer(
            data={**DATOS_JUGADOR, "atributos": {**ATRIBUTOS, "ritmo": 100}}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("ritmo", serializer.errors["atributos"])

    def test_ignora_usuario_enviado_por_el_cliente(self):
        otro = get_user_model().objects.create_user(username="otro", password="x")
        serializer = JugadorSerializer(data={**DATOS_JUGADOR, "usuario": otro.pk})
        self.assertTrue(serializer.is_valid(), serializer.errors)

        jugador = serializer.save(usuario=self.usuario)

        self.assertEqual(jugador.usuario, self.usuario)

    def test_actualizacion_parcial_modifica_atributos_existentes(self):
        jugador = crear_jugador()
        Atributos.objects.create(jugador=jugador, **ATRIBUTOS)

        serializer = JugadorSerializer(
            jugador, data={"atributos": {"tiro": 90}}, partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        jugador.atributos.refresh_from_db()
        self.assertEqual(jugador.atributos.tiro, 90)
        self.assertEqual(jugador.atributos.ritmo, 80)

    def test_actualizacion_crea_atributos_si_no_existian(self):
        jugador = crear_jugador()

        serializer = JugadorSerializer(jugador, data={"atributos": ATRIBUTOS}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertEqual(Atributos.objects.get(jugador=jugador).pase, 70)
