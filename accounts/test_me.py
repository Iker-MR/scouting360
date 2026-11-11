from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from scouting.models import Jugador

# Literal path on purpose: the frontend depends on this exact URL.
ME_URL = "/api/auth/me/"

User = get_user_model()


class MeTests(APITestCase):
    def setUp(self):
        self.usuario = User.objects.create_user(
            username="ojeadora",
            email="ojeadora@example.com",
            password="clave-segura-123",
        )

    def crear_perfil(self, usuario):
        return Jugador.objects.create(
            usuario=usuario,
            nombre="Test",
            fecha_nacimiento=date(2005, 1, 1),
            posicion=Jugador.Posicion.DELANTERO,
            pierna_dominante=Jugador.Pierna.DIESTRA,
            zona="Madrid",
        )

    def test_sin_autenticar_devuelve_401(self):
        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_devuelve_id_y_username_del_usuario(self):
        self.client.force_authenticate(self.usuario)

        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.usuario.pk)
        self.assertEqual(response.data["username"], "ojeadora")

    def test_jugador_id_es_null_si_no_tiene_perfil(self):
        self.client.force_authenticate(self.usuario)

        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("jugador_id", response.data)
        self.assertIsNone(response.data["jugador_id"])

    def test_jugador_id_es_el_de_su_perfil(self):
        otro = User.objects.create_user(username="otro", password="clave-segura-123")
        self.crear_perfil(otro)
        perfil = self.crear_perfil(self.usuario)
        self.client.force_authenticate(self.usuario)

        response = self.client.get(ME_URL)

        self.assertEqual(response.data["jugador_id"], perfil.pk)

    def test_no_expone_datos_sensibles(self):
        self.client.force_authenticate(self.usuario)

        response = self.client.get(ME_URL)

        self.assertEqual(set(response.data), {"id", "username", "jugador_id"})
