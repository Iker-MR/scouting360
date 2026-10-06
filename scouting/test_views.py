from unittest import mock

from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Atributos, Jugador
from .tests import crear_jugador

LISTA_URL = reverse("jugador-list")

DATOS_JUGADOR = {
    "nombre": "Nuevo",
    "fecha_nacimiento": "2006-05-10",
    "posicion": "EI",
    "pierna_dominante": "I",
    "zona": "Bilbao",
}


def detalle_url(jugador):
    return reverse("jugador-detail", args=[jugador.pk])


class JugadorLecturaTests(APITestCase):
    def test_anonimo_puede_listar_jugadores(self):
        crear_jugador("uno")
        crear_jugador("dos")

        response = self.client.get(LISTA_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_anonimo_puede_ver_el_detalle(self):
        jugador = crear_jugador()
        Atributos.objects.create(jugador=jugador)

        response = self.client.get(detalle_url(jugador))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["overall"], 50)

    def test_filtra_por_posicion(self):
        crear_jugador("delantero")
        portero = crear_jugador("portero")
        portero.posicion = Jugador.Posicion.PORTERO
        portero.save()

        response = self.client.get(LISTA_URL, {"posicion": "PO"})

        self.assertEqual([j["id"] for j in response.data["results"]], [portero.pk])


class JugadorCreacionTests(APITestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(username="nuevo", password="x")

    def test_anonimo_no_puede_crear(self):
        response = self.client.post(LISTA_URL, DATOS_JUGADOR, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(Jugador.objects.exists())

    def test_crea_jugador_asignado_al_usuario_autenticado(self):
        otro = get_user_model().objects.create_user(username="otro", password="x")
        self.client.force_authenticate(self.usuario)

        response = self.client.post(
            LISTA_URL, {**DATOS_JUGADOR, "usuario": otro.pk}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Jugador.objects.get().usuario, self.usuario)

    def test_no_permite_un_segundo_perfil_para_el_mismo_usuario(self):
        self.client.force_authenticate(self.usuario)
        self.client.post(LISTA_URL, DATOS_JUGADOR, format="json")

        response = self.client.post(LISTA_URL, DATOS_JUGADOR, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Jugador.objects.count(), 1)

    def test_carrera_al_crear_perfil_devuelve_400(self):
        # Simulates two concurrent requests: the pre-check does not see the
        # profile the other request just inserted, so the DB constraint fires.
        self.client.force_authenticate(self.usuario)
        self.client.post(LISTA_URL, DATOS_JUGADOR, format="json")

        with mock.patch.object(QuerySet, "exists", return_value=False):
            response = self.client.post(LISTA_URL, DATOS_JUGADOR, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("usuario", response.data)
        self.assertEqual(Jugador.objects.count(), 1)


class JugadorModificacionTests(APITestCase):
    def setUp(self):
        self.jugador = crear_jugador("dueno")
        self.ajeno = get_user_model().objects.create_user(username="ajeno", password="x")

    def test_dueno_puede_editar_su_perfil(self):
        self.client.force_authenticate(self.jugador.usuario)

        response = self.client.patch(
            detalle_url(self.jugador), {"zona": "Sevilla"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.jugador.refresh_from_db()
        self.assertEqual(self.jugador.zona, "Sevilla")

    def test_otro_usuario_no_puede_editar(self):
        self.client.force_authenticate(self.ajeno)

        response = self.client.patch(
            detalle_url(self.jugador), {"zona": "Sevilla"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_otro_usuario_no_puede_borrar(self):
        self.client.force_authenticate(self.ajeno)

        response = self.client.delete(detalle_url(self.jugador))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Jugador.objects.filter(pk=self.jugador.pk).exists())

    def test_dueno_puede_borrar_su_perfil(self):
        self.client.force_authenticate(self.jugador.usuario)

        response = self.client.delete(detalle_url(self.jugador))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Jugador.objects.exists())
