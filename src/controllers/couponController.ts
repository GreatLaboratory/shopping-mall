import { Request, Response, NextFunction} from 'express';

import { Coupon, CouponDocument } from '../models/benefit/Coupon';
import { User, UserDocument } from '../models/user/User';
import { UserCoupon, UserCouponDocument } from '../models/benefit/UserCoupon';

import { Product, ProductDocument } from '../models/product/Product';
import { FirstCategory, FirstCategoryDocument } from '../models/category/FirstCategory';
import { Market, MarketDocument } from '../models/user/Market';

// POST -> 관리자가 쿠폰 생성하기 (마켓상품일 경우 자동 지급)
export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, startDate, endDate, benefitCategory, benefit, maxBenefit, basePrice, firstCategoryId, marketId, maxCountForMarket } = req.body;
    try {
        const coupon: CouponDocument | null = await Coupon.findOne({ name, description, startDate, endDate, benefitCategory, benefit });
        if (coupon) {
            res.status(400).json({ message: '해당하는 이름과 내용의 쿠폰이 이미 존재합니다.'});
        } else {
            if (firstCategoryId) {
                const firstCategory: FirstCategoryDocument | null =  await FirstCategory.findById(firstCategoryId).select('name');
                const productList: ProductDocument[] = await Product.find({ firstCategoryId }).select('_id');
                const productIdList: string[] = productList.map(product => product._id);
                await Coupon.create({
                    name,
                    description,
                    category: `${firstCategory?.name} 상품 대상 쿠폰`,
                    startDate,
                    endDate,
                    benefitCategory,
                    benefit,
                    maxBenefit: maxBenefit ? maxBenefit : undefined,
                    basePrice: basePrice ? basePrice : undefined,
                    productIdList
                });
                res.status(201).json({ message: '성공적으로 쿠폰이 생성되었습니다.' });
            } else if (marketId) {
                const market: MarketDocument | null = await Market.findById(marketId).select('name');
                const productList: ProductDocument[] = await Product.find({ marketId }).select('_id');
                const productIdList: string[] = productList.map(product => product._id);
                await Coupon.create({
                    name,
                    description,
                    category: `${market?.name} 상품 대상 쿠폰`,
                    startDate,
                    endDate,
                    benefitCategory,
                    benefit,
                    maxBenefit: maxBenefit ? maxBenefit : undefined,
                    basePrice: basePrice ? basePrice : undefined,
                    productIdList,
                    marketId,
                    maxCountForMarket
                });
                res.status(201).json({ message: '성공적으로 쿠폰이 생성되었습니다.' });
            } else {
                const productList: ProductDocument[] = await Product.find().select('_id');
                const productIdList: string[] = productList.map(product => product._id);
                await Coupon.create({
                    name,
                    description,
                    category: '모든 상품 대상 쿠폰',
                    startDate,
                    endDate,
                    benefitCategory,
                    benefit,
                    maxBenefit: maxBenefit ? maxBenefit : undefined,
                    basePrice: basePrice ? basePrice : undefined,
                    productIdList,
                });
                res.status(201).json({ message: '성공적으로 쿠폰이 생성되었습니다.' });
            }
        }

    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 관리자가 쿠폰 정보 수정하기
export const modifyCoupon = async (req: Request, res: Response, next: NextFunction) => {
    const { name, description } = req.body;
    const { couponId } = req.params;
    try {
        const updatedCoupon: CouponDocument | null = await Coupon.findByIdAndUpdate(couponId, { name, description });
        if (updatedCoupon) res.status(201).json({ message: '성공적으로 수정되었습니다.' });
        else res.status(400).json({ message: '해당하는 아이디의 쿠폰이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 소비자에게 쿠폰 지급하기
export const giveCouponToUser = async (req: Request, res: Response, next: NextFunction) => {
    const { userIdList } = req.body;
    const { couponId } = req.params;
    try {
        const coupon: CouponDocument | null = await Coupon.findById(couponId);
        if (coupon) {
            const getHistory = async (userIdList: string[]) => { 
                const promises = userIdList.map((userId: string) => {
                    const userCoupon = UserCoupon.create({ userId, couponId });
                    if (userCoupon) return userCoupon;
                });
                return await Promise.all(promises);
            };
            const historyList: any = await getHistory(userIdList);
            const result: UserCouponDocument[] = [];
            historyList.map((history: UserCouponDocument) => result.push(history));

            userIdList.map(async (userId: string, index: number) => {
                const user: UserDocument | null = await User.findById(userId);
                if (user) {
                    result[index].userName = user.name;
                    await result[index].save();
                }
            });
            // 쿠폰이 특정 마켓 전용 쿠폰일 때
            if (coupon.marketId) {
                // 마켓이 발급받은 수량보다 많은 수의 쿠폰을 소비자들에게 뿌리려고 할 때
                if (coupon.maxCountForMarket < coupon.count + userIdList.length) res.status(400).json({ message: '발급 가능 최대수량을 초과했습니다.' });
                else {
                    coupon.userCouponList = coupon.userCouponList.concat(result);
                    coupon.count += userIdList.length;
                    await coupon.save();
                    userIdList.map(async (userId: string) => {
                        const user: UserDocument | null = await User.findById(userId).select('couponIdList');
                        if (user) {
                            user.couponIdList.push(couponId);
                            await user.save();
                        }
                    });
                    res.status(201).json({ message: '성공적으로 지급이 완료되었습니다.' });    
                }
            // 쿠폰이 전체상품이나 특정 카테고리상품 쿠폰일 때
            } else {
                coupon.userCouponList = coupon.userCouponList.concat(result);
                coupon.count += userIdList.length;
                await coupon.save();
                userIdList.map(async (userId: string) => {
                    const user: UserDocument | null = await User.findById(userId).select('couponIdList');
                    if (user) {
                        user.couponIdList.push(couponId);
                        await user.save();
                    }
                });
                res.status(201).json({ message: '성공적으로 지급이 완료되었습니다.' });       
            }
        } else {
            res.status(400).json({ message: '해당하는 아이디의 쿠폰이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};
// PUT -> 소비자에게 쿠폰 지급하기 (중복 지급 막기)
export const blockOverlappedGiving = async (req: Request, res: Response, next: NextFunction) => {
    const { userIdList } = req.body;
    const { couponId } = req.params;
    try {
        const coupon: CouponDocument | null = await Coupon.findById(couponId);
        if (coupon) {
            const getGivedUserList = async (userCouponList: any) => { 
                const promises = userCouponList.map((userCouponId: string) => {
                    const userCoupon = UserCoupon.findById(userCouponId);
                    if (userCoupon) return userCoupon;
                });
                return await Promise.all(promises);
            };
            const givedUserList: any = await getGivedUserList(coupon.userCouponList);

            for (let i = 0; i < userIdList.length; i++) {
                for (let j = 0; j < givedUserList.length; j++) {
                    if (userIdList[i] == givedUserList[j].userId) return res.status(400).json({ message: '이미 지급된 사용자가 선택되었습니다. 중복지급은 불가능합니다.' });
                }
            }
            next();
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};


// GET -> 쿠폰 상세 조회하기
export const couponDetail = async (req: Request, res: Response, next: NextFunction) => {
    const { couponId } = req.params;
    try {
        const coupon: CouponDocument | null = await Coupon.findById(couponId);
        if (coupon) res.status(200).json(coupon);
        else res.status(400).json({ message: '해당하는 아이디의 쿠폰이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 사용자가 보유 쿠폰 목록 조회하기
export const couponListForUser = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        const user: UserDocument | null = await User.findById(userId);
        if (user) {
            const getCoupons = async (couponIdList: string[]) => { 
                const promises = couponIdList.map((couponId: string) => {
                    const coupon = Coupon.findOne({ _id: couponId, startDate: { $lte: Date.now() }, endDate: { $gte: Date.now() } })
                        .select('startDate endDate benefitCategory benefit maxBenefit name category basePrice');
                    if (coupon) return coupon;
                });
                return await Promise.all(promises); 
            };
            const couponList: any = await getCoupons(user.couponIdList);
            const result = couponList.filter((coupon: any) => coupon !== null);
            res.status(200).json(result);
        } else {
            res.status(400).json({ message: '해당하는 아이디의 사용자가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 마켓 또는 관리자가 보유 쿠폰 목록 조회하기
export const couponListForMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId } = req.query;
    try {
        if (marketId) {
            const couponList: CouponDocument[] = await Coupon.find({ marketId })
                .sort('-createdAt')
                .select('name benefitCategory benefit maxBenefit startDate endDate maxCountForMarket');
            res.status(200).json(couponList);
        } else {
            const couponList: CouponDocument[] = await Coupon.find()
                .sort('-createdAt')
                .select('category name benefitCategory benefit maxBenefit startDate endDate maxCountForMarket');
            res.status(200).json(couponList);
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 특정 쿠폰의 사용내역 조회하기
export const usingHistoryForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const { couponId } = req.params;
    try {
        const userCouponList: UserCouponDocument[] = await UserCoupon.find({ couponId });
        res.status(200).json(userCouponList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 사용자 이메일로 사용자 정보 검색 조회
export const findUserByEmail = async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.params;
    try {
        const userList: UserDocument[] = await User.find({ email: { $regex: email } }).select('name email');
        res.status(200).json(userList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 마켓 이름으로 마켓 정보 검색 조회
export const findMarketByName = async (req: Request, res: Response, next: NextFunction) => {
    const { name } = req.params;
    try {
        const marketList: MarketDocument[] = await Market.find({ name: { $regex: name } }).select('image name introduce');
        res.status(200).json(marketList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// DELETE -> 쿠폰 삭제하기
export const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
    const { couponId } = req.params;
    try {
        const coupon: CouponDocument | null = await Coupon.findByIdAndDelete(couponId);
        if (coupon) {
            const userCouponList: UserCouponDocument[] = await UserCoupon.find({ couponId });
            userCouponList.map(async (userCoupon: UserCouponDocument) => {
                const user: UserDocument | null = await User.findById(userCoupon.userId);
                if (user) {
                    const idx: number = user.couponIdList.indexOf(couponId);
                    if (idx !== -1) {
                        user.couponIdList.splice(idx, 1);
                        await user.save();
                    }
                }
                await userCoupon.remove();
            });
            res.status(201).json({ message: '성공적으로 해당 쿠폰이 삭제되었습니다.' });
        } else res.status(400).json({ message: '해당하는 아이디의 쿠폰이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 지급 회수하기 
export const withdrawCoupon = async (req: Request, res: Response, next: NextFunction) => {
    const { couponId } = req.params;
    const { userIdList } = req.body;
    try {
        const coupon: CouponDocument | null = await Coupon.findById(couponId).populate('userCouponList');
        if (coupon) {
            const newUserCouponList: UserCouponDocument[] = coupon.userCouponList.filter(userCoupon => userIdList.indexOf(userCoupon.userId.toString()) === -1);
            coupon.userCouponList = newUserCouponList;
            coupon.count -= userIdList.length;
            await coupon.save();
            userIdList.map(async (userId: string) => {
                await UserCoupon.findOneAndDelete({ userId, couponId });
                const user: UserDocument | null = await User.findById(userId);
                if (user) {
                    const idx: number = user.couponIdList.indexOf(couponId);
                    if (idx !== -1) {
                        user.couponIdList.splice(idx, 1);
                        await user.save();
                    }
                }
            });
            res.status(201).json({ message: '성공적으로 해당 사용자에 대한 쿠폰 회수가 이루어졌습니다.' });
        } else res.status(400).json({ message: '해당하는 아이디의 쿠폰이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 주문하려는 제품의 사용가능한 쿠폰 리스트 조회하기
export const availableCouponList = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.query;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        const user: UserDocument | null = await User.findById(userId);
        if (user) {
            const getCoupons = async (couponIdList: string[]) => { 
                const promises = couponIdList.map((couponId: string) => {
                    const coupon = Coupon.findOne({ _id: couponId, startDate: { $lte: Date.now() }, endDate: { $gte: Date.now() } });
                    if (coupon) return coupon;
                });
                return await Promise.all(promises);
            };
            const couponList: any = await getCoupons(user.couponIdList);
            const result = couponList.filter((coupon: CouponDocument) => coupon !== null && coupon.productIdList.indexOf(productId) !== -1);
            res.status(200).json(result);
        } else {
            res.status(400).json({ message: '해당하는 아이디의 사용자가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};
