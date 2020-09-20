import { Request, Response, NextFunction } from 'express';
import axios, { AxiosRequestConfig } from 'axios';

import { Address, AddressDocument } from '../models/order/Address';
import { Cart, CartDocument, IResponseCart, IResponseCartforMarket } from '../models/order/Cart';
import { Order, OrderDocument, IResponseOrder } from '../models/order/Order';
import { Stock, StockDocument } from '../models/product/Stock';
import { Product, ProductDocument } from '../models/product/Product';
import { User, UserDocument } from '../models/user/User';
import { Review, ReviewDocument } from '../models/product/Review';
import { Market, MarketDocument } from '../models/user/Market';
import { Exchange, ExchangeDocument } from '../models/order/Exchange';
import { UserCoupon } from '../models/benefit/UserCoupon';
import { Point, PointDocument } from '../models/benefit/Point';
import { Coupon } from '../models/benefit/Coupon';
import { SENS_SERVICE_ID, SENS_ACCESS_KEY_ID, SENS_PHONE_NUM, makeSignature } from '../config/secret';

// POST -> 장바구니에 담기
export const addCart = (req: Request, res: Response) => {
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    const { productId, marketId, cartList } = req.body;
    cartList.map(async (cart: CartDocument) => {
        const { color, size, orderNum, orderPrice } = cart;
        const selectedCart: CartDocument | null = await Cart.findOne({ userId, productId, marketId, color, size, isOrdered: false });
        if (selectedCart) {  // 같은 사이즈와 컬러의 상품을 또 장바구니에 담을 때
            selectedCart.orderNum += orderNum;
            selectedCart.orderPrice += orderPrice;
            await selectedCart.save();
        } else {
            await Cart.create({ userId, productId, marketId, color, size, orderNum, orderPrice });
        }
    });
    res.status(201).json({ message: '성공적으로 장바구니에 담았습니다.' });
};

// GET -> 장바구니 조회하기
export const getCartList = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    const resultCartList: IResponseCart[] = [];
    try {
        const cartList: CartDocument[] = await Cart.find({ userId, isOrdered: false }).select('productId marketId color size orderNum orderPrice');
        if (cartList.length === 0) { 
            res.status(200).json([]);
        } else {
            const getProductList = async (cartList: CartDocument[]) => { 
                const promises = cartList.map((cart: CartDocument) => {
                    const { productId } = cart;
                    const product = Product.findById(productId).select('-_id mainImages name marketName');
                    if (product) return product;
                });
                return await Promise.all(promises); 
            };
            const getStockList = async (cartList: CartDocument[]) => { 
                const promises = cartList.map((cart: CartDocument) => {
                    const { productId, color, size } = cart;
                    const stock = Stock.findOne({ productId, color, size }).select('-_id stockNum');
                    if (stock) return stock;
                });
                return await Promise.all(promises); 
            };
            const resultProductList: any = await getProductList(cartList);
            const resultStockList: any = await getStockList(cartList);
            
            for (let i = 0; i < cartList.length; i++) {
                const response: IResponseCart = {
                    cart: cartList[i],
                    marketName: resultProductList[i].marketName,
                    mainImage: resultProductList[i].mainImages[0],
                    productName: resultProductList[i].name,
                    stockNum: resultStockList[i].stockNum
                };
                resultCartList.push(response);
            }
            res.status(200).json(resultCartList);
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// DELETE -> 장바구니 삭제하기
export const deleteCart = async (req: Request, res: Response, next: NextFunction) => {
    const { cartId } = req.params;
    try {
        const cart: CartDocument | null = await Cart.findByIdAndDelete(cartId);
        if (cart) res.status(201).json({ message: '장바구니 삭제가 완료되었습니다.'});
        else res.status(400).json({ message: '해당하는 아이디의 장바구니가 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 주문하기 (재고 체크하기)
export const checkStock = async (req: Request, res: Response, next: NextFunction) => {
    const { productList } = req.body;
    const getStocks = async (productList: CartDocument[]) => {
        const promises = productList.map((cart: CartDocument) => {
            const { productId, color, size } = cart;
            const stock = Stock.findOne({ productId, color, size });
            if (stock) return stock;
            else return null;
        });
        return await Promise.all(promises);
    };
    const resolvedStockList: any = await getStocks(productList);
    const orderPossibleStockList: StockDocument[] = resolvedStockList.filter((stock: StockDocument, index: number) => {
        return stock !== null && stock.stockNum >= productList[index].orderNum && stock.stockNum > 0;
    });
    if (productList.length !== orderPossibleStockList.length) {
        res.status(400).json({ message: '재고처리에 에러가 발생했습니다. 주문에 실패했습니다.'});
    } else {
        orderPossibleStockList.map((stock: StockDocument, index: number) => {
            stock.stockNum -= productList[index].orderNum;
            stock.save();
        });
        next();
    }
};

// POST -> 주문하기
export const addOrder = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    const { productList, name, email, phone, zipCode, address, addressDetail, deliveryMsg, totalPrice, createdAt, couponIdList, point, payType } = req.body;
    const header: AxiosRequestConfig = { headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': Date.now().toString(),
        'x-ncp-iam-access-key': SENS_ACCESS_KEY_ID,
        'x-ncp-apigw-signature-v2': makeSignature()
    }};
    try {
        // 주문 -> 장바구니에 주문상품 존재 유무로 로직 분기
        const order = async (cart: CartDocument): Promise<string> => {
            const { productId, marketId, color, size, orderNum, orderPrice, deliveryFee } = cart;
            const couponDiscountPrice = cart.couponDiscountPrice ? cart.couponDiscountPrice : 0;
            const pointDiscountPrice = cart.pointDiscountPrice ? cart.pointDiscountPrice : 0;
            const usedCouponIdList = cart.usedCouponIdList ? cart.usedCouponIdList : null;
            const result = await Cart.findOne({ userId, productId, color, size, orderNum, orderPrice, isOrdered: false });
            if (!result) {  // 바로 구매할 때
                const newCart = await Cart.create({ 
                    userId, 
                    productId, 
                    marketId, 
                    color, 
                    size, 
                    orderNum, 
                    orderPrice, 
                    couponDiscountPrice, 
                    pointDiscountPrice,
                    usedCouponIdList,
                    deliveryFee,
                    isOrdered: true, 
                    status: '배송준비 중' 
                });
                return newCart._id;
            } else {  // 장바구니에 해당하는 내용을 결제할 때
                const updatedCart = await Cart.findByIdAndUpdate(result._id, { 
                    couponDiscountPrice, 
                    pointDiscountPrice, 
                    usedCouponIdList,
                    deliveryFee,
                    isOrdered: true, 
                    status: '배송준비 중', 
                    createdAt 
                });
                return updatedCart?._id;
            }
        };
    
        const getCartIdList = async (productList: CartDocument[]) => {
            const promises = productList.map(cart => order(cart));
            return await Promise.all(promises);
        };
        const cartIdList = await getCartIdList(productList);

        const newOrder: OrderDocument = await Order.create({
            userId,
            cartIdList,
            name,
            email,
            phone,
            zipCode,
            address,
            addressDetail,
            deliveryMsg,
            totalPrice,
            createdAt,
            payType
        });

        const user: UserDocument | null = await User.findById(userId);
        if (user) {
            // 최근 배송지로 배송할 경우 새롭게 db에 추가시키지 않기
            const orderAddressHistory: AddressDocument | null = await Address.findOne({ zipCode, address, addressDetail, userId });
            if (!orderAddressHistory) {
                const newOrderAddress: AddressDocument = await Address.create({ zipCode, address, addressDetail, userId });
                const recentAddressList: string[] = [...user.recentAdressIdList, newOrderAddress._id];
                user.recentAdressIdList = recentAddressList;
            } else {
                orderAddressHistory.createdAt = createdAt;
                await orderAddressHistory.save();
            }

            // 쿠폰을 사용했을 경우
            if (couponIdList) {
                // 사용내역 db에서 사용처리
                couponIdList.forEach(async (couponId: string) => {
                    await UserCoupon.findOneAndUpdate({ userId, couponId, isUsed: false }, { isUsed: true, useDate: createdAt, orderId: newOrder._id });
                });

                // user db에서 couponIdList배열에서 해당 couponId제거
                couponIdList.forEach((couponId: string) => {
                    if (user) {
                        if (user.couponIdList.includes(couponId)) {
                            const idx: number = user.couponIdList.indexOf(couponId);
                            user.couponIdList.splice(idx, 1);
                        }
                    }
                });
            }

            // 적립금
            if (point) {  // 적립금 사용했을 때
                const pointNum = parseInt(point);
                user.usedPoint += pointNum;
                user.remainPoint -= pointNum;
                await Point.create({ 
                    userId,
                    useDate: createdAt,
                    usingPoint: pointNum,
                    orderId: newOrder._id
                });
            }

            await user.save();
        }

        // 상품 sales필드에 판매량 누적시키기
        const productIdList: string[] = productList.map((product: CartDocument) => product.productId.toString());
        const productObj: any = productIdList.reduce((t: any, a: string) => {
            t[a] = (t[a] || 0) + 1;
            return t;
        }, {});
        productIdList.filter((value, index, array) => array.indexOf(value) === index)
            .map(async (productId: string) => {
                const product: ProductDocument | null = await Product.findById(productId);
                if (product) {
                    product.sales += productObj[productId];
                    await product.save();
                }
            });

                        
        // 마켓 sales필드에 판매량 누적시키기
        const marketIdList: string[] = productList.map((product: CartDocument) => product.marketId.toString());
        const marketObj: any = marketIdList.reduce((accumulator: any, marketId: string) => {
            accumulator[marketId] = (accumulator[marketId] || 0) + 1;
            return accumulator;
        }, {});
        marketIdList.filter((value, index, array) => array.indexOf(value) === index)
            .map(async (marketId: string) => {
                const market: MarketDocument | null = await Market.findById(marketId);
                if (market && market.name !== '해치스') {
                    // 판매자에게 주문건 문자알림
                    try {
                        await axios.post(`https://sens.apigw.ntruss.com/sms/v2/services/${SENS_SERVICE_ID}/messages`, {
                            'type': 'SMS',
                            'from': SENS_PHONE_NUM,
                            'content': `안녕하세요 ${market.name}마켓님! 맨즈바이입니다. \n${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}  ${new Date().getHours()}:${new Date().getMinutes()} 신규 주문 ${marketObj[marketId]}건이 접수되었습니다.`,
                            'messages': [
                                {
                                    'to': market.phone.replace(/-/gi, ''),
                                    'content': `안녕하세요 ${market.name}마켓님! 맨즈바이입니다. \n${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}  ${new Date().getHours()}:${new Date().getMinutes()} 신규 주문 ${marketObj[marketId]}건이 접수되었습니다.`
                                }
                            ],
                        }, 
                        header);
                        market.sales += marketObj[marketId];
                        await market.save();
                    } catch (err) {
                        console.log(err);
                        next(err);
                    }
                }
            });
        
        // Cart DB에 orderId 필드 저장하기
        cartIdList.map(async (cartId: string) => await Cart.findByIdAndUpdate(cartId, { orderId: newOrder._id }));

        res.status(201).json({ message: '주문이 완료되었습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 로그인된 사용자의 주문 목록 조회하기
export const orderListForUser = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    // eslint-disable-next-line no-var
    var responseCartList: IResponseCart[] = [];
    let responseCart: IResponseCart;
    const responseOrderList: IResponseOrder[] = [];
    let responseOrder: IResponseOrder;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 5;
    try {
        const user: UserDocument | null = await User.findById(userId);
        const orderList: OrderDocument[] = await Order.find({ userId })
            .select('cartIdList createdAt totalPrice')
            .populate('cartIdList')
            .sort('-createdAt')
            .skip((resPerPage * pageNum) - resPerPage)
            .limit(resPerPage);
        
        const getProducts = async (cartList: any) => {
            const promises = cartList.map((cart: CartDocument) => {
                const { productId } = cart;
                const product = Product.findById(productId).select('mainImages marketName name firstCategoryId');
                if (product) return product; 
            });
            return await Promise.all(promises);     
        };
        for (let i = 0; i < orderList.length; i++) {
            const cartList: any = orderList[i].cartIdList;
            const productList: any = await getProducts(cartList);
            for (let j = 0; j < cartList.length; j++) {
                const deliveryFirm: string = cartList[j].deliveryFirm ? cartList[j].deliveryFirm : '';
                const deliveryId: string = cartList[j].deliveryId ? cartList[j].deliveryId : '';
                const deliveryNumber: string = cartList[j].deliveryNumber ? cartList[j].deliveryNumber : '';
                if (cartList[j].status === '배송 완료') {
                    let status: string;
                    const today = new Date();
                    const deliveryCompleteDate = cartList[j].deliveryCompleteDate;
                    const diffDate1 = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
                    const diffDate2 = new Date(deliveryCompleteDate.getFullYear(), deliveryCompleteDate.getMonth() + 1, deliveryCompleteDate.getDate());
                    const diff = (diffDate1.getTime() - diffDate2.getTime()) / (1000 * 3600 * 24);
                    if (diff >= 7) {
                        status = '구매 확정';
                        cartList[j].status = '구매 확정';
                        cartList[j].purchaseCompleteDate = new Date();
                        await cartList[j].save();
                        if (user) {
                            user.totalPoint += Math.floor((cartList[j].orderPrice - cartList[j].pointDiscountPrice - cartList[j].couponDiscountPrice) * 0.01);
                            user.remainPoint += Math.floor((cartList[j].orderPrice - cartList[j].pointDiscountPrice - cartList[j].couponDiscountPrice) * 0.01);
                            await user.save();
                            await Point.create({ 
                                userId,
                                takeDate: new Date(),
                                takingPoint: Math.floor((cartList[j].orderPrice - cartList[j].pointDiscountPrice - cartList[j].couponDiscountPrice) * 0.01),
                                orderId: orderList[i]._id
                            });
                        }
                    } else {
                        status = '배송 완료';
                    }
                    responseCart = {
                        cartId: cartList[j]._id,
                        firstCategoryId: productList[j].firstCategoryId,
                        productId: productList[j]._id,
                        color: cartList[j].color,
                        size: cartList[j].size,
                        orderNum: cartList[j].orderNum,
                        orderPrice: cartList[j].orderPrice,
                        mainImage: productList[j].mainImages[0],
                        marketName: productList[j].marketName,
                        productName: productList[j].name,
                        deliveryFirm,
                        deliveryId,
                        deliveryNumber,
                        isReviewed: cartList[j].isReviewed,
                        status
                    };
                } else if (cartList[j].status === '배송 중') {
                    let status: string;
                    const deliveryInfo = await axios.get(`https://apis.tracker.delivery/carriers/${deliveryId}/tracks/${deliveryNumber}`);
                    if (deliveryInfo.data.state && deliveryInfo.data.state.id === 'delivered') {
                        status = '배송 완료';
                        cartList[j].status = '배송 완료';
                        cartList[j].deliveryCompleteDate = new Date();
                        await cartList[j].save();
                    } else {
                        status = '배송 중';
                    }
                    responseCart = {
                        cartId: cartList[j]._id,
                        firstCategoryId: productList[j].firstCategoryId,
                        productId: productList[j]._id,
                        color: cartList[j].color,
                        size: cartList[j].size,
                        orderNum: cartList[j].orderNum,
                        orderPrice: cartList[j].orderPrice,
                        mainImage: productList[j].mainImages[0],
                        marketName: productList[j].marketName,
                        productName: productList[j].name,
                        deliveryFirm,
                        deliveryId,
                        deliveryNumber,
                        isReviewed: cartList[j].isReviewed,
                        status
                    };
                } else if (cartList[j].status === '교환 중') {
                    let status: string;
                    const exchange: ExchangeDocument | null = await Exchange.findById(cartList[j].exchangeId);
                    const deliveryInfo = await axios.get(`https://apis.tracker.delivery/carriers/${exchange?.deliveryId}/tracks/${exchange?.deliveryNumber}`);
                    if (deliveryInfo.data.state.id === 'delivered') {
                        status = '교환 완료';
                        cartList[j].status = '교환 완료';
                        cartList[j].deliveryCompleteDate = new Date();
                        await cartList[j].save();
                    } else {
                        status = '교환 중';
                    }
                    responseCart = {
                        cartId: cartList[j]._id,
                        firstCategoryId: productList[j].firstCategoryId,
                        productId: productList[j]._id,
                        color: cartList[j].color,
                        size: cartList[j].size,
                        orderNum: cartList[j].orderNum,
                        orderPrice: cartList[j].orderPrice,
                        mainImage: productList[j].mainImages[0],
                        marketName: productList[j].marketName,
                        productName: productList[j].name,
                        deliveryFirm,
                        deliveryId,
                        deliveryNumber,
                        isReviewed: cartList[j].isReviewed,
                        status
                    };
                } else {
                    responseCart = {
                        cartId: cartList[j]._id,
                        firstCategoryId: productList[j].firstCategoryId,
                        productId: productList[j]._id,
                        color: cartList[j].color,
                        size: cartList[j].size,
                        orderNum: cartList[j].orderNum,
                        orderPrice: cartList[j].orderPrice,
                        mainImage: productList[j].mainImages[0],
                        marketName: productList[j].marketName,
                        productName: productList[j].name,
                        deliveryFirm,
                        deliveryId,
                        deliveryNumber,
                        isReviewed: cartList[j].isReviewed,
                        status: cartList[j].status
                    };
                }
                responseCartList.push(responseCart);
            }
            responseOrder = {
                orderId: orderList[i]._id,
                orderDate: orderList[i].createdAt,
                cart: responseCartList
            };
            responseOrderList.push(responseOrder);
            responseCartList = [];
        }
        res.status(200).json(responseOrderList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 입점관리자 또는 슈퍼관리자 웹패널에서 주문 목록 조회하기
export const orderListForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const { marketId } = req.query;

    // eslint-disable-next-line no-var
    var responseCartList: IResponseCartforMarket[] = [];
    let responseCart: IResponseCartforMarket;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 5;
    let cartList: CartDocument[];
    try {
        if (marketId) {
            cartList = await Cart.find({ marketId, isOrdered: true })
                .sort('-createdAt')
                .skip((resPerPage * pageNum) - resPerPage)
                .limit(resPerPage);
        } else {
            cartList = await Cart.find({ isOrdered: true })
                .sort('-createdAt')
                .skip((resPerPage * pageNum) - resPerPage)
                .limit(resPerPage);
        }
        if (cartList.length === 0) {
            res.status(200).json([]);
        } else {
            const getOrders = async (cartList: any) => {
                const promises = cartList.map((cart: CartDocument) => {
                    const { orderId } = cart;
                    const order = Order.findById(orderId).select('-cartIdList');
                    if (order) return order; 
                });
                return await Promise.all(promises); 
            };
            const getUsers = async (cartList: any) => {
                const promises = cartList.map((cart: CartDocument) => {
                    const { userId } = cart;
                    const user = User.findById(userId).select('-_id name email');
                    if (user) return user; 
                });
                return await Promise.all(promises); 
            };
            const getProducts = async (cartList: any) => {
                const promises = cartList.map((cart: CartDocument) => {
                    const { productId } = cart;
                    const product = Product.findById(productId).select('mainImages name marketName price discountRate');
                    if (product) return product; 
                });
                return await Promise.all(promises); 
            };
            const orderList: any = await getOrders(cartList);
            const userList: any = await getUsers(cartList);
            const productList: any = await getProducts(cartList);
            for (let i = 0; i < cartList.length; i++) {
                const deliveryFirm: string = cartList[i].deliveryFirm ? cartList[i].deliveryFirm : '';
                const deliveryId: string = cartList[i].deliveryId ? cartList[i].deliveryId : '';
                const deliveryNumber: string = cartList[i].deliveryNumber ? cartList[i].deliveryNumber : '';
                const basicDiscountPrice = productList[i].discountRate === 0 ? 0 : productList[i].price * productList[i].discountRate / 100;
                if (cartList[i].status === '배송 완료') {
                    let status: string;
                    const today = new Date();
                    const deliveryCompleteDate = cartList[i].deliveryCompleteDate;
                    const diffDate1 = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
                    const diffDate2 = new Date(deliveryCompleteDate.getFullYear(), deliveryCompleteDate.getMonth() + 1, deliveryCompleteDate.getDate());
                    const diff = (diffDate1.getTime() - diffDate2.getTime()) / (1000 * 3600 * 24);
                    if (diff >= 7) {
                        status = '구매 확정';
                        cartList[i].status = '구매 확정';
                        cartList[i].purchaseCompleteDate = new Date();
                        await cartList[i].save();
                        const user: UserDocument | null = await User.findById(cartList[i].userId);
                        if (user) {
                            user.totalPoint += Math.floor((cartList[i].orderPrice - cartList[i].pointDiscountPrice - cartList[i].couponDiscountPrice) * 0.01);
                            user.remainPoint += Math.floor((cartList[i].orderPrice - cartList[i].pointDiscountPrice - cartList[i].couponDiscountPrice) * 0.01);
                            await user.save();
                            await Point.create({ 
                                userId: cartList[i].userId,
                                takeDate: new Date(),
                                takingPoint: Math.floor((cartList[i].orderPrice - cartList[i].pointDiscountPrice - cartList[i].couponDiscountPrice) * 0.01),
                                orderId: orderList[i]._id
                            });
                        }
                    } else {
                        status = '배송 완료';
                    }
                    responseCart = {
                        orderId: orderList[i]._id,
                        cartId: cartList[i]._id,
                        marketId: cartList[i].marketId,
                        productId: productList[i]._id,
                        productImage: productList[i].mainImages[0],
                        productName: productList[i].name,
                        orderPrice: cartList[i].orderPrice,
                        orderNum: cartList[i].orderNum,
                        orderUser: userList[i].name,
                        receiveUser: orderList[i].name,
                        phone: orderList[i].phone,
                        zipCode: orderList[i].zipCode,
                        address: orderList[i].address,
                        addressDetail: orderList[i].addressDetail,
                        deliveryMsg: orderList[i].deliveryMsg,
                        orderDate: orderList[i].createdAt,
                        marketName: productList[i].marketName,
                        color: cartList[i].color,
                        size: cartList[i].size,
                        deliveryFirm,
                        deliveryId,
                        deliveryNumber,
                        exchangeId: cartList[i].exchangeId ? cartList[i].exchangeId : '',
                        refundId: cartList[i].refundId ? cartList[i].refundId : '',
                        status,
                        payType: orderList[i].payType,
                        userEmail: userList[i].email,
                        deliveryStartDate: cartList[i].deliveryStartDate ? cartList[i].deliveryStartDate : null,
                        purchaseCompleteDate: cartList[i].purchaseCompleteDate ? cartList[i].purchaseCompleteDate : null,
                        productPrice: productList[i].price,
                        basicDiscountPrice,
                        couponDiscountPrice: cartList[i].couponDiscountPrice,
                        pointDiscountPrice: cartList[i].pointDiscountPrice,
                        deliveryFee: cartList[i].deliveryFee
                    };
                } else if (cartList[i].status === '배송 중') {
                    let status: string;
                    const deliveryInfo = await axios.get(`https://apis.tracker.delivery/carriers/${deliveryId}/tracks/${deliveryNumber}`);
                    if (deliveryInfo.data.state && deliveryInfo.data.state.id === 'delivered') {
                        status = '배송 완료';
                        cartList[i].status = '배송 완료';
                        cartList[i].deliveryCompleteDate = new Date();
                        await cartList[i].save();
                    } else {
                        status = '배송 중';
                    }
                    responseCart = {
                        orderId: orderList[i]._id,
                        cartId: cartList[i]._id,
                        marketId: cartList[i].marketId,
                        productId: productList[i]._id,
                        productImage: productList[i].mainImages[0],
                        productName: productList[i].name,
                        orderPrice: cartList[i].orderPrice,
                        orderNum: cartList[i].orderNum,
                        orderUser: userList[i].name,
                        receiveUser: orderList[i].name,
                        phone: orderList[i].phone,
                        zipCode: orderList[i].zipCode,
                        address: orderList[i].address,
                        addressDetail: orderList[i].addressDetail,
                        deliveryMsg: orderList[i].deliveryMsg,
                        orderDate: orderList[i].createdAt,
                        marketName: productList[i].marketName,
                        color: cartList[i].color,
                        size: cartList[i].size,
                        deliveryFirm,
                        deliveryId,
                        deliveryNumber,
                        exchangeId: cartList[i].exchangeId ? cartList[i].exchangeId : '',
                        refundId: cartList[i].refundId ? cartList[i].refundId : '',
                        status,
                        payType: orderList[i].payType,
                        userEmail: userList[i].email,
                        deliveryStartDate: cartList[i].deliveryStartDate ? cartList[i].deliveryStartDate : null,
                        purchaseCompleteDate: cartList[i].purchaseCompleteDate ? cartList[i].purchaseCompleteDate : null,
                        productPrice: productList[i].price,
                        basicDiscountPrice,
                        couponDiscountPrice: cartList[i].couponDiscountPrice,
                        pointDiscountPrice: cartList[i].pointDiscountPrice,
                        deliveryFee: cartList[i].deliveryFee
                    };
                } else if (cartList[i].status === '교환 중') {
                    let status: string;
                    const exchange: ExchangeDocument | null = await Exchange.findById(cartList[i].exchangeId);
                    const deliveryInfo = await axios.get(`https://apis.tracker.delivery/carriers/${exchange?.deliveryId}/tracks/${exchange?.deliveryNumber}`);
                    if (deliveryInfo.data.state.id === 'delivered') {
                        status = '교환 완료';
                        cartList[i].status = '교환 완료';
                        cartList[i].deliveryCompleteDate = new Date();
                        await cartList[i].save();
                    } else {
                        status = '교환 중';
                    }
                    responseCart = {
                        orderId: orderList[i]._id,
                        cartId: cartList[i]._id,
                        marketId: cartList[i].marketId,
                        productId: productList[i]._id,
                        productImage: productList[i].mainImages[0],
                        productName: productList[i].name,
                        orderPrice: cartList[i].orderPrice,
                        orderNum: cartList[i].orderNum,
                        orderUser: userList[i].name,
                        receiveUser: orderList[i].name,
                        phone: orderList[i].phone,
                        zipCode: orderList[i].zipCode,
                        address: orderList[i].address,
                        addressDetail: orderList[i].addressDetail,
                        deliveryMsg: orderList[i].deliveryMsg,
                        orderDate: orderList[i].createdAt,
                        marketName: productList[i].marketName,
                        color: cartList[i].color,
                        size: cartList[i].size,
                        deliveryFirm,
                        deliveryId,
                        deliveryNumber,
                        exchangeId: cartList[i].exchangeId ? cartList[i].exchangeId : '',
                        refundId: cartList[i].refundId ? cartList[i].refundId : '',
                        status,
                        payType: orderList[i].payType,
                        userEmail: userList[i].email,
                        deliveryStartDate: cartList[i].deliveryStartDate ? cartList[i].deliveryStartDate : null,
                        purchaseCompleteDate: cartList[i].purchaseCompleteDate ? cartList[i].purchaseCompleteDate : null,
                        productPrice: productList[i].price,
                        basicDiscountPrice,
                        couponDiscountPrice: cartList[i].couponDiscountPrice,
                        pointDiscountPrice: cartList[i].pointDiscountPrice,
                        deliveryFee: cartList[i].deliveryFee
                    };
                } else {
                    responseCart = {
                        orderId: orderList[i]._id,
                        cartId: cartList[i]._id,
                        marketId: cartList[i].marketId,
                        productId: productList[i]._id,
                        productImage: productList[i].mainImages[0],
                        productName: productList[i].name,
                        orderPrice: cartList[i].orderPrice,
                        orderNum: cartList[i].orderNum,
                        orderUser: userList[i].name,
                        receiveUser: orderList[i].name,
                        phone: orderList[i].phone,
                        zipCode: orderList[i].zipCode,
                        address: orderList[i].address,
                        addressDetail: orderList[i].addressDetail,
                        deliveryMsg: orderList[i].deliveryMsg,
                        orderDate: orderList[i].createdAt,
                        marketName: productList[i].marketName,
                        color: cartList[i].color,
                        size: cartList[i].size,
                        deliveryFirm,
                        deliveryId,
                        deliveryNumber,
                        exchangeId: cartList[i].exchangeId ? cartList[i].exchangeId : '',
                        refundId: cartList[i].refundId ? cartList[i].refundId : '',
                        status: cartList[i].status,
                        payType: orderList[i].payType,
                        userEmail: userList[i].email,
                        deliveryStartDate: cartList[i].deliveryStartDate ? cartList[i].deliveryStartDate : null,
                        purchaseCompleteDate: cartList[i].purchaseCompleteDate ? cartList[i].purchaseCompleteDate : null,
                        productPrice: productList[i].price,
                        basicDiscountPrice,
                        couponDiscountPrice: cartList[i].couponDiscountPrice,
                        pointDiscountPrice: cartList[i].pointDiscountPrice,
                        deliveryFee: cartList[i].deliveryFee
                    };
                }
                responseCartList.push(responseCart);
            }
            res.status(200).json(responseCartList);
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};


// GET -> 주문 내용 상세 조회하기
export const orderList = async (req: Request, res: Response, next: NextFunction) => {
    const { cartId } = req.params;
    try {
        const cart: CartDocument | null = await Cart.findById(cartId).populate('orderId');
        if (!cart) {
            res.status(400).json({ message: '해당하는 아이디의 주문이 존재하지 않습니다.' });
        } else {
            const { marketId, orderId, usedCouponIdList, couponDiscountPrice, pointDiscountPrice, orderPrice, deliveryFee } = cart;
            const { name, phone, zipCode, address, addressDetail, totalPrice, _id, payType } = orderId as any;
            res.status(200).json({ 
                orderId: _id, 
                marketId,
                name, 
                phone, 
                zipCode, 
                address, 
                addressDetail, 
                totalPrice, 
                payType,
                orderPrice,
                usedCouponIdList,
                couponDiscountPrice,
                pointDiscountPrice,
                deliveryFee
            });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};


// POST -> 운송장 번호 입력 및 변경하기
export const addDeliveryInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { cartId, deliveryFirm, deliveryNumber, deliveryId } = req.body;
    try {
        const cart: CartDocument | null = await Cart.findById(cartId);
        if (!cart) {
            res.status(404).json({ message: '해당하는 id값의 주문정보가 존재하지 않습니다.' });
        } else {
            try {
                const deliveryInfo = await axios.get(`https://apis.tracker.delivery/carriers/${deliveryId}/tracks/${deliveryNumber}`);
                cart.deliveryNumber = deliveryNumber;
                cart.deliveryFirm = deliveryFirm;
                cart.deliveryId = deliveryId;
                cart.deliveryStartDate = new Date();
                if (deliveryInfo.status === 200) cart.status = '배송 중';
                await cart.save();
                res.status(200).json({ mesage: `택배사는 ${deliveryFirm}이며, 운송장 번호는 ${deliveryNumber}로 입력되었습니다.` });       
            } catch (error) {
                res.status(400).json({ error });
            }
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET   -> 주문 시 이전 배송지정보 조회하기
export const getAddressHistory = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        const addressList: AddressDocument[] = await Address.find({ userId }).sort('-createdAt').limit(3).select('-_id zipCode address addressDetail');
        res.status(200).json(addressList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 주문 취소하기
export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    const { cartId } = req.params;
    const header: AxiosRequestConfig = { headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': Date.now().toString(),
        'x-ncp-iam-access-key': SENS_ACCESS_KEY_ID,
        'x-ncp-apigw-signature-v2': makeSignature()
    }};
    try {
        const cart: CartDocument | null = await Cart.findById(cartId);
        if (!cart) {
            res.status(400).json({ message: '해당하는 아이디의 주문은 존재하지 않습니다.' });
        } else if (cart.status !== '배송준비 중') {
            res.status(400).json({ message: '주문이 배송준비 중일 때에만 주문 취소가 가능합니다.' });
        } else {
            const { orderId, productId, userId, marketId, color, size, orderNum, usedCouponIdList, couponDiscountPrice, pointDiscountPrice } = cart;
            const user: UserDocument | null = await User.findById(userId);
            // 적립금 복원
            if (pointDiscountPrice !== 0) { 
                if (user) {
                    user.remainPoint += pointDiscountPrice;
                    user.usedPoint -= pointDiscountPrice;
                    await user.save();
                }
                const point: PointDocument | null = await Point.findOne({ orderId });
                if (point) {
                    if (point.usingPoint - pointDiscountPrice === 0) {
                        await point.remove();
                    } else {
                        point.usingPoint -= pointDiscountPrice;
                        await point.save();
                    }
                }
            }

            // 쿠폰 복원
            if (couponDiscountPrice !== 0) {
                usedCouponIdList.forEach(async (couponId: string) => {
                    await UserCoupon.findOneAndUpdate({ couponId, userId, isUsed: true }, { isUsed: false, useDate: null, orderId: null });
                    if (user) {
                        user.couponIdList.push(couponId);
                        await user.save();
                    }
                });
            }

            // 상품의 리뷰개수, 판매량 복원
            const product: ProductDocument | null = await Product.findById(productId);
            const review: ReviewDocument | null = await Review.findOneAndDelete({ cartId });
            if (product) {
                if (review) product.review -= 1;
                product.sales -= 1; 
                await product.save();
            }

            // 상품의 재고수량 복원
            const stock: StockDocument | null = await Stock.findOne({ productId, color, size });
            if (stock) {
                stock.stockNum += orderNum;
                await stock.save();
            }

            // 마켓 판매량 복원
            const market: MarketDocument | null = await Market.findById(marketId);
            if (market && market.name !== '해치스') {
                market.sales -= 1;
                await market.save();

                // 판매자에게 주문취소건 문자알림
                await axios.post(`https://sens.apigw.ntruss.com/sms/v2/services/${SENS_SERVICE_ID}/messages`, {
                    'type': 'SMS',
                    'from': SENS_PHONE_NUM,
                    'content': `안녕하세요 ${market.name}마켓님! 맨즈바이입니다. \n${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}  ${new Date().getHours()}:${new Date().getMinutes()} 주문 1건이 취소되었습니다.`,
                    'messages': [
                        {
                            'to': market.phone.replace(/-/gi, ''),
                            'content': `안녕하세요 ${market.name}마켓님! 맨즈바이입니다. \n${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}  ${new Date().getHours()}:${new Date().getMinutes()} 주문 1건이 취소되었습니다.`
                        }
                    ],
                }, 
                header);
            }

            // 주문상태 변경
            cart.status = '주문 취소';
            await cart.save();
            res.status(201).json(cart);
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 주문 최종 금액 검증하기
export const calculatePrice = async (req: Request, res: Response, next: NextFunction) => {
    const { productList, point } = req.body;
    let finalPrice: number = 0;
    try {
        const getDBProductList = async (productList: any) => { 
            const promises = productList.map((product: any) => {
                const { productId } = product;
                const dbProduct = Product.findById(productId);
                if (dbProduct) return dbProduct;
            });
            return await Promise.all(promises); 
        };
        const getDBStockList = async (productList: any) => { 
            const promises = productList.map((product: any) => {
                const { color, size, productId } = product;
                const dbStock = Stock.findOne({ color, size, productId });
                if (dbStock) return dbStock;
            });
            return await Promise.all(promises); 
        };
        const getDBCouponList = async (couponIdList: any) => { 
            const promises = couponIdList.map((couponId: any) => {
                const dbCoupon = Coupon.findById(couponId);
                if (dbCoupon) return dbCoupon;
            });
            return await Promise.all(promises); 
        };
        const dbStockList: any = await getDBStockList(productList);
        const dbProductList: any = await getDBProductList(productList);

        for (let i = 0; i < productList.length; i++) {
            const { count, couponList } = productList[i];
            const price: number = dbProductList[i].price * (100 - dbProductList[i].discountRate) / 100 + dbStockList[i].optionPrice;
            if (!couponList) finalPrice += (count * price);  // Case1 : 쿠폰 적용없이 계산
            else {  // Case2 : 쿠폰 적용 계산 
                const dbCouponList: any = await getDBCouponList(couponList);
                for (let j = 0; j < dbCouponList.length; j++) {
                    const { benefitCategory, benefit, maxBenefit } = dbCouponList[j];
                    let benefitPrice;  // 할인되는 가격
                    if (benefitCategory === '할인금액') benefitPrice = price - benefit > 0 ? benefit : price;  // Case1 : 쿠폰이 금액 할인일 경우
                    else {  // Case2 : 쿠폰이 퍼센트 할인일 경우  
                        benefitPrice = (price * benefit) / 100;
                        if (maxBenefit && maxBenefit < benefitPrice) benefitPrice = maxBenefit;
                    };
                    finalPrice += (price - benefitPrice);
                }
                if (count - couponList.length > 0) finalPrice += ((count - couponList.length) * price);
            }
        }
        finalPrice -= point;
        res.status(200).json({ finalPrice });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 구매확정하기
export const finalizePurchase = async (req: Request, res: Response, next: NextFunction) => {
    const { cartId } = req.body;
    try {
        const cart: CartDocument | null = await Cart.findById(cartId);
        if (cart) {
            if (cart.status === '배송 완료') {
                const { userId, orderId } = cart;
                cart.status = '구매 확정';
                cart.purchaseCompleteDate = new Date();
                await cart.save();
                const user: UserDocument | null = await User.findById(userId);
                const order: OrderDocument | null = await Order.findById(orderId);
                if (user && order) {
                    user.totalPoint += Math.floor(order.totalPrice * 0.01);
                    user.remainPoint += Math.floor(order.totalPrice * 0.01);
                    await user.save();
                    await Point.create({ 
                        userId: cart.userId,
                        takeDate: new Date(),
                        takingPoint: Math.floor((cart.orderPrice - cart.pointDiscountPrice - cart.couponDiscountPrice) * 0.01),
                        orderId: order._id
                    });
                }
                res.status(200).json({ message: '구매확정이 성공적으로 처리되었습니다.' });
            } else {
                res.status(400).json({ message: '구매확정 처리는 배송 완료인 상태에서만 가능합니다.' });
            }
        } else {
            res.status(400).json({ message: '해당하는 아이디의 주문이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 도서산간 지역 검증하기
export const isIsolatedRegion = (req: Request, res: Response) => {
    const zipCode: number = req.body.zipCode;
    let isIsolatedRegion: boolean = false;
    if (zipCode >= 22386 && zipCode <= 22388) {
        isIsolatedRegion = true;
    } else if (zipCode >= 23004  && zipCode <= 23010 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 23100  && zipCode <= 23116  ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 23124  && zipCode <= 23136  ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 31708  && zipCode <= 31708 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 32133  && zipCode <= 32133 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 33411  && zipCode <= 33411 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 40200  && zipCode <= 40240 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 46768  && zipCode <= 46771 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 52570  && zipCode <= 52571 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 53031  && zipCode <= 53033 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 53089  && zipCode <= 53104 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 54000  && zipCode <= 54000 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 56347  && zipCode <= 56349 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 58760   && zipCode <= 57069 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 58800  && zipCode <= 58762 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 58816  && zipCode <= 58818 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 58826  && zipCode <= 58826 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 58828  && zipCode <= 58866 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 58953  && zipCode <= 58958 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59102  && zipCode <= 59103 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59106  && zipCode <= 59106 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59127  && zipCode <= 59127 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59129  && zipCode <= 59129 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59137  && zipCode <= 59166 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59421  && zipCode <= 59421 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59531  && zipCode <= 59531 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59551  && zipCode <= 59551 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59563  && zipCode <= 59563 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59568  && zipCode <= 59568 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59650  && zipCode <= 59650 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59766  && zipCode <= 59766 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 59781  && zipCode <= 59790 ) {
        isIsolatedRegion = true;
    } else if (zipCode >= 63000  && zipCode <= 63644 ) {
        isIsolatedRegion = true;
    }
    res.status(200).json({ isIsolatedRegion });
};

// GET -> 판매자 패널에서 주문 결제 금액 상세 조회하기
export const getOrderPriceDetailList = async (req: Request, res: Response, next: NextFunction) => {
    const { orderId, marketId } = req.params;
    let result: IResponseCartforMarket;
    const resultList: IResponseCartforMarket[] = [];
    try {
        if (orderId && marketId) {
            const cartList = await Cart.find({ isOrdered: true, orderId, marketId })
                .select('orderPrice orderNum couponDiscountPrice pointDiscountPrice productId')
                .populate('productId') as any;

            for (let i = 0; i < cartList.length; i++) {
                const basicDiscountPrice = cartList[i].productId.discountRate === 0 ? 0 : cartList[i].productId.price * cartList[i].productId.discountRate / 100;
                result = {
                    cartId: cartList[i]._id,
                    orderPrice: cartList[i].orderPrice,
                    orderNum: cartList[i].orderNum,
                    productPrice: cartList[i].productId.price,
                    basicDiscountPrice,
                    couponDiscountPrice: cartList[i].couponDiscountPrice,
                    pointDiscountPrice: cartList[i].pointDiscountPrice,
                };
                resultList.push(result);
            }
            res.status(200).json(resultList);
        } else {
            res.status(400).json({ message: 'orderId와 marketId를 params에 입력해주세요.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};
