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
        if Jugador.objects.filter(usuario=self.request.user).exists():
            raise ValidationError({"usuario": "Este usuario ya tiene un perfil de jugador."})
        serializer.save(usuario=self.request.user)
