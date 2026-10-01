from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Anyone can read; only the owning user can modify the object."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.usuario_id == request.user.id
