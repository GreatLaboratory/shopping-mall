import { PassportStatic } from 'passport';
import { Market } from '../../models/user/Market';

export const localMarket = (passport: PassportStatic) => {
    passport.use('market', Market.createStrategy());

    passport.serializeUser(Market.serializeUser());
    passport.deserializeUser(Market.deserializeUser());
};
