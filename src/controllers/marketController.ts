import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import axios, { AxiosRequestConfig } from 'axios';

import { SENS_ACCESS_KEY_ID, SENS_PHONE_NUM, SENS_SERVICE_ID, makeSignature } from '../config/secret';
import { Cart, CartDocument } from '../models/order/Cart';
import { Market, MarketDocument, IResponseBestMarket } from '../models/user/Market';
import { Model, ModelDocument } from '../models/product/Model';
import { Product, ProductDocument } from '../models/product/Product';
import { Quality } from '../models/product/Quality';
import { Size } from '../models/product/Size';
import { Stock } from '../models/product/Stock';
import { User, UserDocument } from '../models/user/User';
import { Review, ReviewDocument } from '../models/product/Review';
import { Ask, AskDocument } from '../models/product/Ask';
import { Notice, NoticeDocument } from '../models/info/Notice';
import { Order, OrderDocument } from '../models/order/Order';
import { Bargain, BargainDocument } from '../models/info/Bargain';
import { Coupon, CouponDocument } from '../models/benefit/Coupon';

// GET -> 로그인하기
export const login = passport.authenticate('market');

// POST -> 회원가입하기
export const signUp = async (req: Request, res: Response, next: NextFunction) => {
    const { email, name, image, phone, owner, url, businessNum, introduce, root, tags, agreeTerms, agreePrivateInfo, agreeMarketingInfo, password, createdAt } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const business = files.business === undefined ? '' : files.business[0].location;
    const telemarket = files.telemarket === undefined ? '' : files.telemarket[0].location;
    const bankbook = files.bankbook === undefined ? '' : files.bankbook[0].location;
    try {
        const market: MarketDocument | null = await Market.findOne({ email });
        if (!market) {
            const marketInfo: MarketDocument = new Market({
                email,
                name,
                image,
                phone,
                owner,
                url,
                businessNum,
                introduce,
                tags,
                root,
                agreeTerms,
                agreePrivateInfo,
                agreeMarketingInfo,
                business,
                telemarket,
                bankbook,
                allowStatus: '입점 심사중',
                rejectReason: '',
                createdAt
            });
            await Market.register(marketInfo, password);
            res.status(201).json({ message: '회원가입에 성공했습니다.'});
        } else {
            res.status(409).json({ message: '이미 가입된 유저입니다.' });
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
    const market: MarketDocument | null = await Market.findOne({ $and: [{ email }, { phone }] });
    if (market) {
        try {
            await market.setPassword(tmpPassword);
            await market.save();
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
        res.status(409).json({ message: '가입된 핸드폰번호과 이메일이 아닙니다. 확인해주세요.' });
    }
};

// PUT -> 마켓 정보 수정하기
export const modifyMarketInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId, image, phone, introduce, agreeTerms, agreePrivateInfo, agreeMarketingInfo, newPassword, tags } = req.body;
    try {
        const market = await Market.findById(marketId);
        if (market) {
            if (newPassword) await market.setPassword(newPassword);
            market.image = image;
            market.phone = phone;
            market.introduce = introduce;
            market.tags = tags;
            market.agreeMarketingInfo = agreeMarketingInfo;
            market.agreePrivateInfo = agreePrivateInfo;
            market.agreeTerms = agreeTerms;
            await market.save();
            res.status(201).json({ message: '마켓의 정보수정이 완료되었습니다.'});
        } else {
            res.status(404).json({ message: '해당하는 아이디의 마켓이 존재하지 않습니다.'});
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 서비스 홈 화면에서 최근 마켓 4개 보여주기
export const getNewFourMarkets = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const marketList: MarketDocument[] = await Market.find({ allowStatus: '입점 허가' })
            .sort('-createdAt')
            .limit(4)
            .select('image name');
        res.status(200).json(marketList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};
// GET -> 서비스 홈 화면에서 최근 마켓 20개 보여주기
export const getNewTwentyMarketList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const marketList: MarketDocument[] = await Market.find({ allowStatus: '입점 허가' })
            .sort('-createdAt')
            .limit(20)
            .select('image name tags');
        res.status(200).json(marketList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 하단 마켓 탭 눌렀을 때 판매량 순으로 10개씩 마켓보여주기
export const getBestMarketList = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 10;
    try {
        const marketList: MarketDocument[] = await Market.find({ allowStatus: '입점 허가' })
            .sort('-sales')
            .select('image name tags')
            .skip((resPerPage * pageNum) - resPerPage)
            .limit(resPerPage);

        const threeMarketId: string[] = marketList.map(market => market._id).filter((value, index) => index < 3);                                                    

        const getProducts = async (marketIdList: string[]) => { 
            const promises = marketIdList.map((marketId: string) => {
                const productList = Product.find({ marketId, allowStatus: '판매 허가' }).sort('-sales').select('-_id mainImages').limit(3);
                if (productList) return productList;
            });
            return await Promise.all(promises); 
        };
        const resultProduct: any = await getProducts(threeMarketId);

        const responseMarketList: IResponseBestMarket[] = marketList.map((market: MarketDocument, index: number) => {
            const { _id, name, tags, image } = market;
            const responseMarket: IResponseBestMarket = {
                _id,
                name,
                tags,
                image,
                productImages: index < 3 ? resultProduct[index] : null
            };
            return responseMarket;
        });

        res.status(200).json(pageNum === 1 ? responseMarketList : marketList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 마켓 상세조회
export const getMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId } = req.params;
    try {
        const market: MarketDocument | null = await Market.findById(marketId)
            .select('-_id image name url introduce like allowStatus tags');
        if (market) res.status(200).json(market);
        else res.status(400).json({ message: '해당하는 아이디의 마켓이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// DELETE -> 마켓 삭제하기
export const deleteMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId } = req.params;
    try {
        const market: MarketDocument | null = await Market.findByIdAndDelete(marketId);
        if (market) {
            const productList: ProductDocument[] = await Product.find({ marketId });
            const couponList: CouponDocument[] = await Coupon.find({ marketId });
            const userList: UserDocument[] = await User.find();
            const bargainList: BargainDocument[] = await Bargain.find();
            const orderList: OrderDocument[] = await Order.find();
            const marketForReviewList: ReviewDocument[] = await Review.find({ marketId });
            const marketForAskList: AskDocument[] = await Ask.find({ marketId });
            const marketForNoticeList: NoticeDocument[] = await Notice.find({ marketId });
            
            // market과 관련된 review, ask, notice 삭제
            marketForNoticeList.forEach((notice: NoticeDocument) => notice.remove());
            marketForReviewList.forEach((review: ReviewDocument) => review.remove());
            marketForAskList.forEach((ask: AskDocument) => ask.remove());
            
            productList.forEach(async (product: ProductDocument) => {
                const productId: string = product._id;
                
                const productForAskList: AskDocument[] = await Ask.find({ productId });
                const productForReviewList: ReviewDocument[] = await Review.find({ productId });
                const cartList: CartDocument[] = await Cart.find({ productId });

                // product와 관련된 review, ask삭제
                productForReviewList.forEach((review: ReviewDocument) => review.remove());
                productForAskList.forEach((ask: AskDocument) => ask.remove());
               
                userList.forEach(async (user: UserDocument) => {
                    // 좋아요한 상품에서 해당 마켓의 상품 삭제
                    if (user.likeProductIdList.includes(productId)) {
                        const idx: number = user.likeProductIdList.indexOf(productId);
                        user.likeProductIdList.splice(idx, 1);
                    };

                    // 좋아요한 마켓 삭제
                    const idx: number = user.likeMarketIdList.indexOf(marketId);
                    if (idx !== -1) user.likeMarketIdList.splice(idx, 1);
                    
                    // coupon 삭제
                    couponList.forEach(async (coupon: CouponDocument) => {
                        const couponId: string = coupon._id;
                        if (user.couponIdList.includes(couponId)){
                            const idx: number = user.couponIdList.indexOf(couponId);
                            user.couponIdList.splice(idx, 1);
                        };
                        await Coupon.findByIdAndDelete(couponId);
                    });
                    await user.save();
                });

                // 기획전에서 해당 마켓의 상품 삭제
                bargainList.forEach(async (bargain: BargainDocument) => {
                    if (bargain.productIdList.includes(product._id)) {
                        const idx: number = bargain.productIdList.indexOf(product._id);
                        bargain.productIdList.splice(idx, 1);
                        await bargain.save();
                    }
                });
                
                cartList.forEach(async (cart: CartDocument) => {
                    const cartId: string = cart._id;
                    // 상품 1개 order일 경우 order 삭제, 아닐경우 order에서 해당 cartId 삭제 후 총 가격 수정 
                    orderList.forEach(async (order: OrderDocument) => {
                        if (order.cartIdList.includes(cartId)){
                            if (order.cartIdList.length === 1){
                                await order.remove();
                            } else {
                                const idx: number = order.cartIdList.indexOf(cartId);
                                order.cartIdList.splice(idx, 1);
                                order.totalPrice -= cart.orderPrice;
                                await order.save();
                            }
                        }
                    });
                    await cart.remove();
                });

                // 해당 상품의 stock, size, quality, model 삭제
                product.stockIdList.forEach(async (stockId: string) => await Stock.findByIdAndDelete(stockId));
                product.sizeIdList.forEach(async (sizeId: string) => await Size.findByIdAndDelete(sizeId));
                await Quality.findByIdAndDelete(product.qualityId);
                await Model.findByIdAndDelete(product.modelId);
                await product.remove();
            });
            res.status(201).json({ message: '성공적으로 삭제했습니다.' });
        } else {
            res.status(400).json({ message: '해당하는 아이디의 마켓이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 마켓이 상품등록할 때 이전에 저장해놓은 모델 정보 조회하기
export const getSavedModelInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId } = req.params;
    try {
        const market: MarketDocument | null = await Market.findById(marketId);
        if (!market) {
            res.status(404).json({ message: '해당하는 아이디의 마켓이 존재하지 않습니다.' });
        } else {
            const model: ModelDocument | null = await Model.findById(market.modelId);
            if (!model) {
                res.status(404).json({ message: '이전에 저장한 모델의 정보가 존재하지 않습니다.' });
            } else {
                res.status(200).json(model);
            }
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};
