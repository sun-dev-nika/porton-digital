export class DomainError extends Error {}

export class InvalidCredentialsError extends DomainError {}

export class InvalidInvitationInputError extends DomainError {}

export class InvalidInvitationWindowError extends DomainError {}

export class ResidentNotFoundError extends DomainError {}

export class InvitationCodeGenerationError extends DomainError {}

export class InvitationNotFoundError extends DomainError {}

export class InvitationAccessDeniedError extends DomainError {}

export class InvitationAlreadyUsedError extends DomainError {}

export class InvitationExpiredError extends DomainError {}

export class InvitationNotYetValidError extends DomainError {}

export class InvalidManualEntryInputError extends DomainError {}

export class UnitNotFoundError extends DomainError {}

export class InvalidPushTokenInputError extends DomainError {}
