#!/bin/bash

# Script para configurar usuario en el nuevo User Pool de ia-control
# Requiere AWS CLI configurado con permisos de Cognito

USER_POOL_ID="us-east-1_mfnduAii4"
EMAIL="guillescontreras@gmail.com"  # Tu email
TEMP_PASSWORD="TempPass123!"  # Contraseña temporal
REGION="us-east-1"

echo "🔧 Configurando usuario para ia-control..."
echo "User Pool ID: $USER_POOL_ID"
echo "Email: $EMAIL"

# 1. Crear usuario
echo "📝 Creando usuario..."
aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username $EMAIL \
    --user-attributes Name=email,Value=$EMAIL Name=email_verified,Value=true \
    --temporary-password $TEMP_PASSWORD \
    --message-action SUPPRESS \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ Usuario creado exitosamente"
else
    echo "❌ Error al crear usuario (puede que ya exista)"
fi

# 2. Asignar al grupo de administradores
echo "👑 Asignando al grupo ia-control-admins..."
aws cognito-idp admin-add-user-to-group \
    --user-pool-id $USER_POOL_ID \
    --username $EMAIL \
    --group-name "ia-control-admins" \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ Usuario asignado al grupo ia-control-admins"
else
    echo "❌ Error al asignar grupo"
fi

# 3. Establecer contraseña permanente
echo "🔑 Estableciendo contraseña permanente..."
aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username $EMAIL \
    --password $TEMP_PASSWORD \
    --permanent \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ Contraseña establecida como permanente"
else
    echo "❌ Error al establecer contraseña"
fi

echo ""
echo "🎉 Configuración completada!"
echo "📧 Email: $EMAIL"
echo "🔑 Contraseña: $TEMP_PASSWORD"
echo "🌐 Puedes iniciar sesión en ia-control ahora"
echo ""
echo "⚠️  Recuerda cambiar la contraseña después del primer login"