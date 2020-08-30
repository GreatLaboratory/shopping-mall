import { PassportStatic } from 'passport';

import { localUser } from './localUserStrategy';
import { localMarket } from './localMarketStrategy';
import { jwtUser } from './jwtStrategy';
import { User, UserDocument } from '../../models/user/User';

export const passportConfig = (passport: PassportStatic) => {
    localUser(passport);
    localMarket(passport);
    jwtUser(passport);

    passport.serializeUser((user: UserDocument, done) => {
        console.log('-------------serialize');
        done(null, user._id);
    });
    
    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            console.log('-------------deserialize');
            done(null, user);
        });
    });
};
