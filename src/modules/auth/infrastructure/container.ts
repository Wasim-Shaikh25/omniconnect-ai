import { makeRegisterUser } from "../application/register-user";
import { PrismaAccountRepository } from "./account.repository";
import { BcryptPasswordHasher } from "./password-hasher";

/** Composition root for the auth module's use-cases. */
export const registerUser = makeRegisterUser({
  accounts: new PrismaAccountRepository(),
  hasher: new BcryptPasswordHasher(),
});
