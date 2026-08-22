import { SetMetadata } from '@nestjs/common';

export const ALLOW_INCOMPLETE_SUBSCRIPTION_KEY = 'allowIncompleteSubscription';

/** Permite acceso aunque la suscripción SaaS esté incompleta (checkout, sync). */
export const AllowIncompleteSubscription = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(ALLOW_INCOMPLETE_SUBSCRIPTION_KEY, true);
