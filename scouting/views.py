from django.db import IntegrityError, transaction
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError

from .models import Jugador
from .permissions import IsOwnerOrReadOnly
from .serializers import JugadorSerializer


class JugadorViewSet(viewsets.ModelViewSet):
    queryset = Jugador.objects.select_related("atributos")
    serializer_class = JugadorSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filterset_fields = ["posicion", "pierna_dominante", "disponible", "zona"]
    search_fields = ["nombre", "zona", "club_actual"]

    def perform_create(self, serializer):
        # Each user owns at most one player profile (OneToOne on usuario).
        # The DB unique constraint is the source of truth: a pre-check with
        # exists() would still race with concurrent requests.
        try:
            with transaction.atomic():
                serializer.save(usuario=self.request.user)
        except IntegrityError:
            raise ValidationError({"usuario": "Este usuario ya tiene un perfil de jugador."})
