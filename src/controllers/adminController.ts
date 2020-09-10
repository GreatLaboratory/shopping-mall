import { Request, Response, NextFunction } from 'express';

import { Market, MarketDocument } from '../models/user/Market';
import { User, UserDocument } from '../models/user/User';
import { Product, ProductDocument } from '../models/product/Product';
import { Coupon, CouponDocument } from '../models/benefit/Coupon';
import { Bargain, BargainDocument } from '../models/info/Bargain';

// POST -> 입점 허가 or 거부하기
export const allowMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { allowStatus, rejectReason, marketId } = req.body.params;
    try {
        const market: MarketDocument | null = await Market.findById(marketId);
        if (market) {
            const productList: ProductDocument[] = await Product.find({ marketId }).populate('firstCategoryId');
            market.allowStatus = allowStatus;
            market.rejectReason = rejectReason;
            await market.save();
            if (allowStatus == '입점 거부') {
                const userList: UserDocument[] = await User.find();
                userList.map(async (user: UserDocument) => {
                    const idx: number = user.likeMarketIdList.indexOf(marketId);
                    if (idx !== -1) {
                        user.likeMarketIdList.splice(idx, 1);
                        await user.save();
                    }
                });
                productList.map(async (product: any) => {
                    // 좋아요 상품 리스트 배열 변경
                    userList.map(async (user: UserDocument) => {
                        const idx: number = user.likeProductIdList.indexOf(product._id);
                        if (idx !== -1) {
                            user.likeProductIdList.splice(idx, 1);
                            await user.save();
                        }
                    });
                    product.like = 0;

                    // 기획전 상품 리스트 배열 변경
                    const bargainList: BargainDocument[] = await Bargain.find();
                    bargainList.map(async (bargain: BargainDocument) => {
                        const idx: number = bargain.productIdList.indexOf(product._id);
                        if (idx !== -1) {
                            bargain.productIdList.splice(idx, 1);
                            await bargain.save();
                        }
                    });

                    // 쿠폰 상품리스트 배열 변경
                    const marketCouponList: CouponDocument[]  = await Coupon.find({ marketId: product.marketId });
                    marketCouponList.map(async (coupon: CouponDocument) => {
                        const idx: number = coupon.productIdList.indexOf(product._id);
                        if (idx !== -1) {
                            coupon.productIdList.splice(idx, 1);
                            await coupon.save();
                        }
                    });
                    const allCouponList: CouponDocument[]  = await Coupon.find({ category: '모든 상품 대상 쿠폰' });
                    allCouponList.map(async (coupon: CouponDocument) => {
                        const idx: number = coupon.productIdList.indexOf(product._id);
                        if (idx !== -1) {
                            coupon.productIdList.splice(idx, 1);
                            await coupon.save();
                        }
                    });
                    const categoryCouponList: CouponDocument[]  = await Coupon.find({ category: { $regex: product.firstCategoryId.name } });
                    categoryCouponList.map(async (coupon: CouponDocument) => {
                        const idx: number = coupon.productIdList.indexOf(product._id);
                        if (idx !== -1) {
                            coupon.productIdList.splice(idx, 1);
                            await coupon.save();
                        }
                    });
                    product.allowStatus = '판매 거부';
                    product.rejectReason = '입점 거부에 의한 판매 거부';
                    await product.save();
                });
            } else if (allowStatus == '입점 허가') {
                productList.map(async (product: any) => {
                    const marketCouponList: CouponDocument[]  = await Coupon.find({ marketId: product.marketId });
                    marketCouponList.map(async (coupon: CouponDocument) => {
                        coupon.productIdList.push(product._id);
                        await coupon.save();
                    });
                    const allCouponList: CouponDocument[]  = await Coupon.find({ category: '모든 상품 대상 쿠폰' });
                    allCouponList.map(async (coupon: CouponDocument) => {
                        coupon.productIdList.push(product._id);
                        await coupon.save();
                    });
                    const categoryCouponList: CouponDocument[]  = await Coupon.find({ category: { $regex: product.firstCategoryId.name } });
                    categoryCouponList.map(async (coupon: CouponDocument) => {
                        coupon.productIdList.push(product._id);
                        await coupon.save();
                    });
                    product.allowStatus = '판매 심사중';
                    product.rejectReason = '입점 허가에 의한 판매 재심사';
                    product.save();
                });
            }
            res.status(201).json({ message: '입점상태가 변경되었습니다.' });
        } else {
            res.status(404).json({ message: '해당하는 마켓이 존재하지않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};
  
// POST -> 판매 허가 or 거부하기
export const allowProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { productId, rejectReason, allowStatus } = req.body.params;
    try {
        const product: any = await Product.findById(productId).populate('firstCategoryId');
        if (product) {
            // 쿠폰 상품리스트 배열 변경
            if (allowStatus === '판매 허가') {
                const marketCouponList: CouponDocument[]  = await Coupon.find({ marketId: product.marketId });
                marketCouponList.forEach((coupon: CouponDocument) => {
                    coupon.productIdList.push(productId);
                    coupon.save();
                });
                const allCouponList: CouponDocument[]  = await Coupon.find({ category: '모든 상품 대상 쿠폰' });
                allCouponList.forEach((coupon: CouponDocument) => {
                    coupon.productIdList.push(productId);
                    coupon.save();
                });
                const categoryCouponList: CouponDocument[]  = await Coupon.find({ category: { $regex: product.firstCategoryId.name } });
                categoryCouponList.forEach((coupon: CouponDocument) => {
                    coupon.productIdList.push(productId);
                    coupon.save();
                });
            } else {  // 판매 거절할 때
                // 좋아요 상품 리스트 배열 변경
                const userList: UserDocument[] = await User.find();
                userList.forEach((user: UserDocument) => {
                    if (user.likeProductIdList.includes(productId)) {
                        const idx: number = user.likeProductIdList.indexOf(productId);
                        user.likeProductIdList.splice(idx, 1);
                        user.save();
                    }
                });
                product.like = 0;

                // 기획전 상품 리스트 배열 변경
                const bargainList: BargainDocument[] = await Bargain.find();
                bargainList.forEach((bargain: BargainDocument) => {
                    if (bargain.productIdList.includes(productId)) {
                        const idx: number = bargain.productIdList.indexOf(productId);
                        bargain.productIdList.splice(idx, 1);
                        bargain.save();
                    }
                });

                // 쿠폰 상품리스트 배열 변경
                const couponList: CouponDocument[]  = await Coupon.find();
                couponList.forEach((coupon: CouponDocument) => {
                    if (coupon.productIdList.includes(productId)) {
                        const idx: number = coupon.productIdList.indexOf(productId);
                        coupon.productIdList.splice(idx, 1);
                        coupon.save();
                    }
                });
            }
            product.allowStatus = allowStatus;
            product.rejectReason = rejectReason;
            await product.save();
            res.status(201).json({ message: '판매상태가 변경되었습니다.' });
        } else {
            res.status(404).json({ message: '해당하는 상품이 존재하지않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 전체 마켓 리스트 조회하기
export const getMarketList = async (req: Request, res: Response, next: NextFunction) => {
    const { allowStatus } = req.query;
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 5;
    let marketList: MarketDocument[];
    try {
        if (allowStatus) marketList = await Market
            .find({ allowStatus })
            .sort('-createdAt')
            .skip((resPerPage * pageNum) - resPerPage)
            .limit(resPerPage);  
        else marketList = await Market
            .find()
            .sort('-createdAt')
            .skip((resPerPage * pageNum) - resPerPage)
            .limit(resPerPage); 
        res.status(200).json(marketList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// DELETE -> 마켓 삭제하기
export const deleteMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId } = req.params;
    try {
        const market: MarketDocument | null = await Market.findById(marketId);
        if (market) {
            if (market.allowStatus !== '입점 거부') {
                res.status(400).json({ message: '입점 거부된 마켓만 삭제할 수 있습니다.' });
            } else {
                const userList: UserDocument[] = await User.find();
                userList.map((user: UserDocument) => {
                    const idx: number = user.likeMarketIdList.indexOf(marketId);
                    user.likeMarketIdList.splice(idx, 1);
                    user.save();
                });
                await market.remove();
                res.status(201).json({ message: '정상적으로 마켓이 삭제되었습니다.' });
            }
        } else {
            res.status(404).json({ message: '해당하는 아이디의 마켓이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};
