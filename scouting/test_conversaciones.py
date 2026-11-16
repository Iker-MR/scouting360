from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Conversacion, Mensaje, Ojeador
from .tests import crear_jugador, crear_ojeador

# Literal path on purpose: the frontend depends on this exact URL.
LISTA_URL = "/api/conversaciones/"

TEXTO = "Hola, te vi jugar el domingo. ¿Hablamos?"


def nacido_hace(anios, dias_extra=0):
    """Birth date that makes someone `anios` old today, shifted `dias_extra` days later."""
    hoy = date.today() + timedelta(days=dias_extra)
    try:
        return hoy.replace(year=hoy.year - anios)
    except ValueError:  # 29 February in a non-leap year
        return hoy.replace(year=hoy.year - anios, day=28)


class IniciarConversacionTests(APITestCase):
    def setUp(self):
        self.ojeador = crear_ojeador("ojeadora")
        self.adulto = crear_jugador("adulto")
        self.menor = crear_jugador("menor", fecha_nacimiento=nacido_hace(18, dias_extra=1))

    def iniciar(self, jugador, texto=TEXTO, **extra):
        return self.client.post(
            LISTA_URL, {"jugador": jugador.pk, "texto": texto, **extra}, format="json"
        )

    def llenar_cupo(self, ojeador, cantidad=3):
        for i in range(cantidad):
            Conversacion.objects.create(ojeador=ojeador, jugador=crear_jugador(f"lleno{i}"))

    def test_anonimo_no_puede_iniciar(self):
        response = self.iniciar(self.adulto)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(Conversacion.objects.exists())

    def test_un_jugador_no_puede_iniciar(self):
        otro = crear_jugador("otro")
        self.client.force_authenticate(otro.usuario)

        response = self.iniciar(self.adulto)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Conversacion.objects.exists())

    def test_ojeador_inicia_conversacion_con_un_adulto(self):
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.iniciar(self.adulto)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        conversacion = Conversacion.objects.get()
        self.assertEqual(conversacion.ojeador, self.ojeador)
        self.assertEqual(conversacion.jugador, self.adulto)
        mensaje = Mensaje.objects.get()
        self.assertEqual(mensaje.conversacion, conversacion)
        self.assertEqual(mensaje.autor, self.ojeador.usuario)
        self.assertEqual(mensaje.texto, TEXTO)

    def test_ignora_ojeador_enviado_por_el_cliente(self):
        # The scout comes from the request, so nobody can spend someone else's quota.
        otra = crear_ojeador("otra")
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.iniciar(self.adulto, ojeador=otra.pk)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversacion.objects.get().ojeador, self.ojeador)

    def test_plan_gratis_no_puede_superar_tres_conversaciones(self):
        self.llenar_cupo(self.ojeador)
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.iniciar(self.adulto)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"].code, "cupo_agotado")
        self.assertEqual(Conversacion.objects.count(), 3)
        self.assertFalse(Mensaje.objects.exists())

    def test_plan_premium_no_tiene_cupo(self):
        premium = crear_ojeador("premium", plan=Ojeador.Plan.PREMIUM)
        self.llenar_cupo(premium)
        self.client.force_authenticate(premium.usuario)

        response = self.iniciar(self.adulto)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversacion.objects.filter(ojeador=premium).count(), 4)

    def test_ojeador_sin_verificar_no_puede_contactar_a_un_menor(self):
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.iniciar(self.menor)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"].code, "requiere_verificacion")
        self.assertFalse(Conversacion.objects.exists())

    def test_ojeador_verificado_puede_contactar_a_un_menor(self):
        verificada = crear_ojeador("verificada", verificado=True)
        self.client.force_authenticate(verificada.usuario)

        response = self.iniciar(self.menor)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_quien_cumple_18_hoy_es_adulto(self):
        cumple_hoy = crear_jugador("cumple", fecha_nacimiento=nacido_hace(18))
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.iniciar(cumple_hoy)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_no_se_repite_conversacion_con_el_mismo_jugador(self):
        self.client.force_authenticate(self.ojeador.usuario)
        self.iniciar(self.adulto)

        response = self.iniciar(self.adulto)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("jugador", response.data)
        self.assertEqual(Conversacion.objects.count(), 1)
        self.assertEqual(Mensaje.objects.count(), 1)

    def test_repetir_jugador_con_cupo_lleno_avisa_que_ya_existe(self):
        # Writing again to someone you already talk to is not "out of quota":
        # the frontend must not push an upgrade for it.
        self.llenar_cupo(self.ojeador, cantidad=2)
        Conversacion.objects.create(ojeador=self.ojeador, jugador=self.adulto)
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.iniciar(self.adulto)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("jugador", response.data)
        self.assertEqual(Conversacion.objects.count(), 3)

    def test_texto_vacio_no_inicia_conversacion(self):
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.iniciar(self.adulto, texto="")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("texto", response.data)
        self.assertFalse(Conversacion.objects.exists())


def mensajes_url(conversacion):
    return f"/api/conversaciones/{conversacion.pk}/mensajes/"


class ConversacionExistenteTestCase(APITestCase):
    """A scout already talking to a player, plus an outsider with no part in it."""

    def setUp(self):
        self.ojeador = crear_ojeador("ojeadora")
        self.jugador = crear_jugador("jugadora")
        self.conversacion = Conversacion.objects.create(ojeador=self.ojeador, jugador=self.jugador)
        self.ajeno = crear_jugador("ajeno").usuario


class BandejaTests(ConversacionExistenteTestCase):
    def setUp(self):
        super().setUp()
        # Noise: a conversation between two other people.
        self.otra = Conversacion.objects.create(
            ojeador=crear_ojeador("otro_ojeador"), jugador=crear_jugador("otro_jugador")
        )

    def ids_en_bandeja(self, usuario):
        self.client.force_authenticate(usuario)
        response = self.client.get(LISTA_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return [c["id"] for c in response.data["results"]]

    def test_anonimo_no_ve_la_bandeja(self):
        response = self.client.get(LISTA_URL)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_ojeador_ve_solo_sus_conversaciones(self):
        self.assertEqual(self.ids_en_bandeja(self.ojeador.usuario), [self.conversacion.pk])

    def test_jugador_ve_solo_las_conversaciones_con_el(self):
        self.assertEqual(self.ids_en_bandeja(self.jugador.usuario), [self.conversacion.pk])

    def test_usuario_no_involucrado_ve_la_bandeja_vacia(self):
        self.assertEqual(self.ids_en_bandeja(self.ajeno), [])


class LeerHiloTests(ConversacionExistenteTestCase):
    def setUp(self):
        super().setUp()
        ahora = timezone.now()
        # Inserted newest first, so id order and chronological order differ.
        respuesta = Mensaje.objects.create(
            conversacion=self.conversacion, autor=self.jugador.usuario, texto="¡Sí, claro!"
        )
        primero = Mensaje.objects.create(
            conversacion=self.conversacion, autor=self.ojeador.usuario, texto=TEXTO
        )
        Mensaje.objects.filter(pk=primero.pk).update(enviado=ahora - timedelta(hours=1))
        Mensaje.objects.filter(pk=respuesta.pk).update(enviado=ahora)

    def test_participante_ve_el_hilo_en_orden_cronologico(self):
        self.client.force_authenticate(self.jugador.usuario)

        response = self.client.get(mensajes_url(self.conversacion))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [(m["autor"], m["texto"]) for m in response.data],
            [("ojeador", TEXTO), ("jugador", "¡Sí, claro!")],
        )

    def test_mensaje_no_expone_ids_de_usuario(self):
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.client.get(mensajes_url(self.conversacion))

        self.assertEqual(set(response.data[0]), {"id", "autor", "texto", "enviado"})

    def test_ajeno_no_ve_el_hilo(self):
        # 404, not 403: an outsider must not learn the conversation exists.
        self.client.force_authenticate(self.ajeno)

        response = self.client.get(mensajes_url(self.conversacion))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ResponderTests(ConversacionExistenteTestCase):
    def responder(self, usuario, texto="Gracias por escribir."):
        self.client.force_authenticate(usuario)
        return self.client.post(mensajes_url(self.conversacion), {"texto": texto}, format="json")

    def test_jugador_responde(self):
        response = self.responder(self.jugador.usuario)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["autor"], "jugador")
        mensaje = Mensaje.objects.get()
        self.assertEqual(mensaje.conversacion, self.conversacion)
        self.assertEqual(mensaje.autor, self.jugador.usuario)

    def test_responder_no_gasta_cupo(self):
        # The quota counts conversations started, never messages.
        for i in range(2):
            Conversacion.objects.create(ojeador=self.ojeador, jugador=crear_jugador(f"lleno{i}"))

        response = self.responder(self.ojeador.usuario)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["autor"], "ojeador")

    def test_ajeno_no_puede_responder(self):
        response = self.responder(self.ajeno)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(Mensaje.objects.exists())

    def test_texto_vacio_no_se_envia(self):
        response = self.responder(self.jugador.usuario, texto="")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("texto", response.data)
        self.assertFalse(Mensaje.objects.exists())
