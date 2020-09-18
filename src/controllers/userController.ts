/* eslint-disable @typescript-eslint/camelcase */
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import cache from 'memory-cache';
import axios, { AxiosRequestConfig } from 'axios';
import jwt from 'jsonwebtoken';

import { User, UserDocument } from '../models/user/User';
import { Product, ProductDocument } from '../models/product/Product';
import { Market, MarketDocument } from '../models/user/Market';
import { Point, PointDocument } from '../models/benefit/Point';
import { SENS_SERVICE_ID, SENS_ACCESS_KEY_ID, SENS_PHONE_NUM, makeSignature } from '../config/secret';
import { UserCoupon, UserCouponDocument } from '../models/benefit/UserCoupon';
import { Coupon, CouponDocument } from '../models/benefit/Coupon';
import { Order, OrderDocument } from '../models/order/Order';
import { Cart, CartDocument } from '../models/order/Cart';
import { CommentDocument, Comment } from '../models/info/event/Comment';
import { AddressDocument, Address } from '../models/order/Address';
import { Ask, AskDocument } from '../models/product/Ask';
import { Review, ReviewDocument } from '../models/product/Review';
import { JWT_SECRET } from '../config/secret';

// 2만원 쿠폰팩
const couponIdList: string[] = [
    '5f193ac87a31336be7306516', 
    '5f193aa661e05d4c7edf07d1', 
    '5f193a837a31336be7306515', 
    '5f1939e861e05d4c7edf07d0', 
    '5f19398e7a31336be7306514', 
    '5f1938fb7a31336be7306513', 
    '5f1938cb61e05d4c7edf07cf'
];

// POST -> 로그인하기
export const passportLocalLogin = passport.authenticate('local');

// jwt 검증하기
export const passportJwtLogin = passport.authenticate('jwt', { session: false });

// POST -> 로그인하기
export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            res.status(409).json({ message: '세션에 사용자가 존재하지 않습니다.' });
        } else {
            const user = req.user as UserDocument;
            const token: string = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
            res
                .status(200)
                .json({ token: `Bearer ${token}` });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 카카오톡 로그인하기
export const kakao  = async (req: Request, res: Response, next: NextFunction)=> {
    const { accessToken } = req.body;
    const header: AxiosRequestConfig = { headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
    }};
    try {
        const userInfo = await axios.get('https://kapi.kakao.com/v2/user/me', header);
        const yakGwan = await axios.get('https://kapi.kakao.com/v1/user/service/terms', header);
        const { email, profile, has_phone_number, phone_number } = userInfo.data.kakao_account;
        const phone = has_phone_number ? ('0' + phone_number.substring(4)).replace(/\-/g, '') : '';
        const exUser: UserDocument | null = await User.findOne({ email, phone });
        if (exUser) {
            req.user = exUser;
            next();
        } else {
            const newUser: UserDocument = await User.create({ 
                snsId: userInfo.data.id,
                name: profile.nickname,
                email,
                phone,
                agreeTerms: true,
                agreePrivateInfo: true,
                agreeMarketingInfo: yakGwan.data.allowed_service_terms.length === 3,
                couponIdList
            });

            // 쿠폰팩 2만원 증정
            couponIdList.forEach(async (couponId: string) => {
                const userCoupon: UserCouponDocument = await UserCoupon.create({ userId: newUser._id, couponId, userName: newUser.name });
                const coupon: CouponDocument | null = await Coupon.findById(couponId);
                if (coupon) {
                    coupon.userCouponList.push(userCoupon._id);
                    coupon.count++;
                    await coupon.save();
                }
            });
            req.user = newUser;
            next();
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 애플 로그인하기
export const apple  = async (req: Request, res: Response, next: NextFunction)=> {
    const { email } = req.body;
    try {
        const user: UserDocument | null = await User.findOne({ email });
        if (user) {
            req.user = user;
            next();
        } else {
            res.status(404).json({ message: '해당하는 토큰을 가지고있는 사용자가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// FCM 토큰 저장하기
export const setFCMToken  = async (req: Request, res: Response, next: NextFunction)=> {
    const { fcmToken } = req.body;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        const updatedUser: UserDocument | null = await User.findByIdAndUpdate(userId, { fcmToken });
        if (updatedUser) res.status(200).json({ message: 'success' });
        else res.status(404).json({ message: '해당하는 토큰값의 사용자가 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 현재 로그인된 사용자 정보 조회하기
export const currentUser  = async (req: Request, res: Response, next: NextFunction)=> {
    const user: UserDocument = req.user as UserDocument;
    const { name, email, phone, remainPoint, couponIdList, _id } = user;
    try {
        res.status(200).json({
            userId: _id,
            name,
            email,
            phone,
            couponNum: couponIdList.length,
            remainPoint
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 회원가입하기
export const signUp = async (req: Request, res: Response, next: NextFunction) => {
    const { email, name, phone, agreeTerms, agreePrivateInfo, agreeMarketingInfo, password } = req.body.joinUser;
    try {
        const emailUser: UserDocument | null = await User.findOne({ email });
        const phoneUser: UserDocument | null = await User.findOne({ phone });
        if (!emailUser) {
            if (!phone || !phoneUser) {
                const userInfo: UserDocument = new User({
                    email,
                    name,
                    phone,
                    agreeTerms,
                    agreePrivateInfo,
                    agreeMarketingInfo,
                    couponIdList
                });
                await User.register(userInfo, password);

                // 쿠폰팩 2만원 증정
                couponIdList.forEach(async (couponId: string) => {
                    const userCoupon: UserCouponDocument = await UserCoupon.create({ userId: userInfo._id, couponId, userName: name });
                    const coupon: CouponDocument | null = await Coupon.findById(couponId);
                    if (coupon) {
                        coupon.userCouponList.push(userCoupon._id);
                        coupon.count++;
                        await coupon.save();
                    }
                });
                res.status(201).json({ message: '성공적으로 회원가입하였습니다.' });
            } else {
                res.status(409).json({ message: '전화번호가 이미 가입된 유저입니다.' });
            }
        } else {
            res.status(409).json({ message: '이메일이 이미 가입된 유저입니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 이메일 찾기
export const findEmail = async (req: Request, res: Response, next: NextFunction) => {
    const { name, phone } = req.body.params;
    try {
        const user: UserDocument | null = await User.findOne({ $and: [{ name }, { phone }] }).select('-_id email');
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(409).json({ message: '아이디를 찾지 못했습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 비밀번호 재발급
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email, phone } = req.body;
    const header: AxiosRequestConfig = { headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': Date.now().toString(),
        'x-ncp-iam-access-key': SENS_ACCESS_KEY_ID,
        'x-ncp-apigw-signature-v2': makeSignature()
    }};
    const makeid = (length: number): string => {
        let result: string = '';
        const characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    };
    const tmpPassword: string = makeid(6);
    const user: UserDocument | null = await User.findOne({ $and: [{ email }, { phone }] });
    if (user) {
        try {
            await user.setPassword(tmpPassword);
            await user.save();
            await axios.post(`https://sens.apigw.ntruss.com/sms/v2/services/${SENS_SERVICE_ID}/messages`, {
                'type': 'SMS',
                'from': SENS_PHONE_NUM,
                'content': `재발급 비밀번호는 ${tmpPassword}입니다.`,
                'messages': [
                    {
                        'to': `${phone}`,
                        'content': `재발급 비밀번호는 ${tmpPassword}입니다.`
                    }
                ],
            }, 
            header);
            res.status(201).json({ message: `${phone}으로 임시 비밀번호가 발급되었습니다. / 비밀번호 : ${tmpPassword}` });
        } catch (err) {
            console.log(err);
            next(err);
        }
    } else {
        res.status(409).json({ message: '가입된 핸드폰번호와 이메일이 아닙니다. 확인해주세요.' });
    }
};

// POST -> 회원 정보 수정하기
export const changeUserData = async (req: Request, res: Response, next: NextFunction) => {
    // const { id, email, password, name, phone, agreeMarketingInfo } = req.body.changeUser;
    const { email, password, name, phone, agreeMarketingInfo } = req.body.changeUser;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        // const user: UserDocument | null = await User.findById(id);
        const user: UserDocument | null = await User.findById(userId);
        if (user) {
            if (password) await user.setPassword(password);
            user.email = email;
            user.name = name;
            user.phone = phone;
            user.agreeMarketingInfo = agreeMarketingInfo;
            await user.save();
            res.status(201).json({ message: '회원정보가 정상적으로 수정되었습니다.' });
        } else {
            res.status(409).json({ message: '해당 id의 회원정보가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};
  
// DELETE -> 회원 탈퇴하기
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        const deleteUser: UserDocument | null = await User.findByIdAndDelete(userId);
        if (deleteUser) {
            const orderList: OrderDocument[] = await Order.find({ userId });
            const cartList: CartDocument[] = await Cart.find({ userId });
            const commentList: CommentDocument[] = await Comment.find({ userId });
            const addressList: AddressDocument[] = await Address.find({ userId });
            const pointList: PointDocument[] = await Point.find({ userId });
            const userCouponList: UserCouponDocument[] = await UserCoupon.find({ userId });
            const askList: AskDocument[] = await Ask.find({ userId });
            const reviewList: ReviewDocument[] = await Review.find({ userId });

            orderList.forEach(async (order: OrderDocument) => {
                await order.remove();
            });
            cartList.forEach(async (cart: CartDocument) => {
                await cart.remove();
            });
            commentList.forEach(async (comment: CommentDocument) => {
                await comment.remove();
            });
            addressList.forEach(async (address: AddressDocument) => {
                await address.remove();
            });
            pointList.forEach(async (point: PointDocument) => {
                await point.remove();
            });
            reviewList.forEach(async (review: ReviewDocument) => {
                await review.remove();
            });
            askList.forEach(async (ask: AskDocument) => {
                await ask.remove();
            });

            userCouponList.forEach(async (userCoupon: UserCouponDocument ) => {
                const coupon: CouponDocument | null = await Coupon.findById(userCoupon.couponId);
                if (coupon && coupon.userCouponList.includes(userCoupon._id)) {
                    coupon.userCouponList.splice(coupon.userCouponList.indexOf(userCoupon._id), 1);
                    coupon.count--;
                    await coupon.save();
                }
                await userCoupon.remove();
            });
            res.status(201).json({ message: '정상적으로 삭제되었습니다.' });
        } else {
            res.status(400).json({ message: '해당하는 아이디의 유저가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 상품 좋아요 누르기 || 취소하기
export const likeThisProductOrNot = async (req: Request, res: Response, next: NextFunction) => {
    const { productId, like } = req.body;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        if (like === true) {
            await User.findById(userId, (err, user: UserDocument) => {
                if (err) console.log(err);
                if (user) {
                    user.likeProductIdList.push(productId);
                    user.save();
                }
            });
            await Product.findById(productId, (err, product: ProductDocument) => {
                if (err) console.log(err);
                if (product) {
                    product.like += 1;
                    product.save();
                    res.status(201).json({ message: '정상적으로 좋아요가 등록되었습니다.' });
                }
            });
        } else {
            await User.findById(userId, (err, user: UserDocument) => {
                if (err) console.log(err);
                if (user) {
                    const idx: number = user.likeProductIdList.indexOf(productId);
                    user.likeProductIdList.splice(idx, 1);
                    user.save();
                }
            });
            await Product.findById(productId, (err, product: ProductDocument) => {
                if (err) console.log(err);
                if (product) {
                    product.like -= 1;
                    product.save();
                    res.status(201).json({ message: '정상적으로 좋아요가 취소되었습니다.' });
                }
            });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 마켓 좋아요 누르기 || 취소하기
export const likeThisMarketOrNot = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId, like } = req.body;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        if (like === true) {
            await User.findById(userId, (err, user: UserDocument) => {
                if (err) console.log(err);
                if (user) {
                    user.likeMarketIdList.push(marketId);
                    user.save();
                }
            });
            await Market.findById(marketId, (err, market: MarketDocument) => {
                if (err) console.log(err);
                if (market) {
                    market.like += 1;
                    market.save();
                    res.status(201).json({ message: '정상적으로 좋아요가 등록되었습니다.' });
                }
            });
        } else {
            await User.findById(userId, (err, user: UserDocument) => {
                if (err) console.log(err);
                if (user) {
                    const idx: number = user.likeMarketIdList.indexOf(marketId);
                    user.likeMarketIdList.splice(idx, 1);
                    user.save();
                }
            });
            await Market.findById(marketId, (err, market: MarketDocument) => {
                if (err) console.log(err);
                if (market) {
                    market.like -= 1;
                    market.save();
                    res.status(201).json({ message: '정상적으로 좋아요가 취소되었습니다.' });
                }
            });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 좋아요 누른 상품 리스트 조회하기
export const getLikedProductList = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    try {
        if (user) {
            if (user.likeProductIdList.length === 0) {
                res.status(200).json([]);
            } else {
                const getLikeProducts = async (likeProductIdList: string[]) => { 
                    const promises = likeProductIdList.map((productId: string) => {
                        const product = Product.findById(productId).select('mainImages name price discountRate marketName sales'); 
                        if (product) return product;
                    });
                    return await Promise.all(promises); 
                };
                const normalUserList: any = await getLikeProducts(user.likeProductIdList);
                res.status(200).json(normalUserList);
            }
        } else {
            res.status(404).json({ message: '로그인된 사용자가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 좋아요 누른 마켓 리스트 조회하기
export const getLikedMarketList = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    try {
        if (user) {
            if (user.likeMarketIdList.length === 0) {
                res.status(200).json([]);
            } else {
                const getLikeMarkets = async (likeMarketIdList: string[]) => { 
                    const promises = likeMarketIdList.map((marketId: string) => {
                        const market = Market.findById(marketId).select('image name tags'); 
                        if (market) return market;
                    });
                    return await Promise.all(promises); 
                };
                const normalUserList: any = await getLikeMarkets(user.likeMarketIdList);
                res.status(200).json(normalUserList);
            }
        } else {
            res.status(404).json({ message: '해당하는 아이디의 사용자가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 적립금 사용내역 조회하기
export const getPointList = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        const pointList: PointDocument[] = await Point.find({ userId }).sort('-createdAt');
        res.status(200).json(pointList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 적립금 조회하기
export const getPoint = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        const user: UserDocument | null = await User.findById(userId);
        if (user) {
            const { totalPoint, remainPoint, usedPoint } = user;
            const result = {
                totalPoint,
                remainPoint,
                usedPoint
            };
            res.status(200).json(result);
        } else {
            res.status(400).json({ message: '해당하는 아이디의 사용자가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 폰번호 입력받고 해당 번호로 인증번호 발송
export const sendCodeToPhone = async (req: Request, res: Response, next: NextFunction) => {
    const { phoneNum } = req.body;
    // const cache: CacheClass<string, number> = new CacheClass();

    // 서버에서 생성한 인증번호
    const verifyNum: number = Math.floor(Math.random() * 10000000) + 1;

    // 만약 클라에서 입력받은 폰번호가 키값으로 이미 메모리캐시에 올라가져있다면 먼저 있던걸 삭제
    cache.del(phoneNum);
    
    // phoneNum이라는 key에다가 verifyNum이라는 value를 메모리캐시에 4분동안 저장 / 이후 자동삭제됨
    cache.put(phoneNum, verifyNum, 180000);

    // naver sens에 request 발생시킨다.
    const header: AxiosRequestConfig = { headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': Date.now().toString(),
        'x-ncp-iam-access-key': SENS_ACCESS_KEY_ID,
        'x-ncp-apigw-signature-v2': makeSignature()
    }};
    try {
        await axios.post(`https://sens.apigw.ntruss.com/sms/v2/services/${SENS_SERVICE_ID}/messages`, {
            'type': 'SMS',
            'from': SENS_PHONE_NUM,
            'content': `맨즈바이 가입을 위한 인증번호는 ${verifyNum}입니다.`,
            'messages': [
                {
                    'to': phoneNum,
                    'content': `맨즈바이 가입을 위한 인증번호는 ${verifyNum}입니다.`
                }
            ],
        }, 
        header);
        res.status(201).json({ message: '인증번호 전송 완료' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 사용자가 입력한 인증번호로 인증
export const verifyCode  = async (req: Request, res: Response, next: NextFunction)=> {
    try {
        const { phoneNum, verifyNumFromClient } = req.body;
        // const cache: CacheClass<string, number> = new CacheClass();
        const verifyNumFromServer: number | null = cache.get(phoneNum);

        if (verifyNumFromServer?.toString() === verifyNumFromClient) {
            res.status(201).json({message : '인증에 성공하였습니다.'});
        } else {
            res.status(409).json({message : '인증번호가 일치하지않습니다.'});
        }
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 로그아웃
export const logout  = async (req: Request, res: Response, next: NextFunction)=> {
    try {
    } catch (err) {
        console.log(err);
        next(err);
    }
};
