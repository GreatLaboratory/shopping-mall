import { PassportStatic } from 'passport';
import { User } from '../../models/user/User';

export const localUser = (passport: PassportStatic) => {
    passport.use(User.createStrategy());

    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
};
