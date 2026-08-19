export class DomainError extends Error {}

export class InvalidCredentialsError extends DomainError {}

export class InvalidInvitationInputError extends DomainError {}

export class InvalidInvitationWindowError extends DomainError {}

export class ResidentNotFoundError extends DomainError {}

export class InvitationCodeGenerationError extends DomainError {}

export class InvitationNotFoundError extends DomainError {}

export class InvitationAccessDeniedError extends DomainError {}
