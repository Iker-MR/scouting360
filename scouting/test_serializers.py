from django.contrib.auth import get_user_model
from django.test import TestCase

from .serializers import JugadorSerializer
from .tests import crear_jugador

DATOS_JUGADOR = {
    "nombre": "Nuevo",
    "fecha_nacimiento": "2006-05-10",
    "posicion": "EI",
    "pierna_dominante": "I",
    "zona": "Bilbao",
}


class JugadorSerializerLecturaTests(TestCase):
    def test_serializer_expone_solo_datos_descriptivos(self):
        data = JugadorSerializer(crear_jugador()).data

        self.assertEqual(
            set(data.keys()),
            {
                "id",
                "usuario",
                "nombre",
                "fecha_nacimiento",
                "posicion",
                "posicion_display",
                "pierna_dominante",
                "zona",
                "club_actual",
                "disponible",
                "foto",
                "bio",
                "creado",
            },
        )

    def test_incluye_nombre_legible_de_la_posicion(self):
        data = JugadorSerializer(crear_jugador()).data

        self.assertEqual(data["posicion"], "DL")
        self.assertEqual(data["posicion_display"], "Delantero centro")


class JugadorSerializerEscrituraTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(username="nuevo", password="x")

    def test_ignora_usuario_enviado_por_el_cliente(self):
        otro = get_user_model().objects.create_user(username="otro", password="x")
        serializer = JugadorSerializer(data={**DATOS_JUGADOR, "usuario": otro.pk})
        self.assertTrue(serializer.is_valid(), serializer.errors)

        jugador = serializer.save(usuario=self.usuario)

        self.assertEqual(jugador.usuario, self.usuario)
