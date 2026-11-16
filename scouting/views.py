from django.db.models import Q
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .contacto import iniciar_conversacion
from .models import Conversacion, Jugador, Ojeador
from .permissions import IsOwnerOrReadOnly
from .roles import guardar_perfil_exclusivo
from .serializers import (
    ConversacionSerializer,
    IniciarConversacionSerializer,
    JugadorSerializer,
    MensajeSerializer,
    OjeadorSerializer,
)


class JugadorViewSet(viewsets.ModelViewSet):
    queryset = Jugador.objects.all()
    serializer_class = JugadorSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filterset_fields = ["posicion", "pierna_dominante", "disponible", "zona"]
    # Not "nombre": searching the stored full name would confirm the surname
    # that the public profile hides.
    search_fields = ["zona", "club_actual"]

    def perform_create(self, serializer):
        guardar_perfil_exclusivo(serializer, self.request.user)


class OjeadorViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Scout profiles. No list on purpose: we do not publish a scout directory."""

    queryset = Ojeador.objects.all()
    serializer_class = OjeadorSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        guardar_perfil_exclusivo(serializer, self.request.user)


class ConversacionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """Scout <-> player conversations, visible only to their two participants."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Outsiders get a 404, not a 403: they must not learn a conversation exists.
        usuario = self.request.user
        return Conversacion.objects.filter(
            Q(ojeador__usuario=usuario) | Q(jugador__usuario=usuario)
        ).select_related("ojeador", "jugador")

    def get_serializer_class(self):
        if self.action == "create":
            return IniciarConversacionSerializer
        return ConversacionSerializer

    def perform_create(self, serializer):
        serializer.instance = iniciar_conversacion(
            usuario=self.request.user,
            jugador=serializer.validated_data["jugador"],
            texto=serializer.validated_data["texto"],
        )

    @action(detail=True, methods=["get", "post"], serializer_class=MensajeSerializer)
    def mensajes(self, request, pk=None):
        conversacion = self.get_object()
        if request.method == "GET":
            mensajes = conversacion.mensajes.select_related("conversacion__ojeador")
            return Response(MensajeSerializer(mensajes, many=True).data)
        # Replies never spend quota: it counts conversations started, not messages.
        serializer = MensajeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(conversacion=conversacion, autor=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
