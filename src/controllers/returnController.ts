import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

import { Exchange, ExchangeDocument } from '../models/order/Exchange';
import { Refund, RefundDocument } from '../models/order/Refund';
import { Cart, CartDocument, IResponseCart } from '../models/order/Cart';
import { Stock, StockDocument } from '../models/product/Stock';
import { Order, IResponseOrder } from '../models/order/Order';
import { Product } from '../models/product/Product';
import { UserDocument } from '../models/user/User';

// POST -> 소비자가 교환 신청하기
export const exchange = async (req: Request, res: Response, next: NextFunction) => {
    const { cartId, productId, orderNum, originalColor, originalSize, exchangeColor, exchangeSize, deliveryId, deliveryFirm, deliveryNumber, reason, content } = req.body;
    const file = req.file as Express.Multer.File;
    const image: string = file ? file.location : '';
    try {
        const cart: CartDocument | null = await Cart.findById(cartId);
        const originalStock: StockDocument | null = await Stock.findOne({ color: originalColor, size: originalSize, productId });
        const exchangeStock: StockDocument | null = await Stock.findOne({ color: exchangeColor, size: exchangeSize, productId });
        if (!cart) {
            res.status(400).json({ message: '해당하는 아이디의 주문이 존재하지 않습니다. 교환에 실패했습니다.' });
        } else if (cart.status === '구매 확정') {
            res.status(400).json({ message: '해당하는 아이디의 주문은 이미 구매 확정된 상태입니다. 교환이 불가능합니다.' });
        } else {
            if (!originalStock || !exchangeStock) {
                res.status(400).json({ message: '해당하는 옵션의 재고가 존재하지 않습니다. 교환에 실패했습니다.' });
            } else {
                const exchange: ExchangeDocument = await Exchange.create({
                    cartId,
                    exchangeColor,
                    exchangeSize,
                    deliveryId,
                    deliveryFirm,
                    deliveryNumber,
                    reason,
                    content,
                    image
                });
                cart.status = '교환 신청';
                cart.exchangeId = exchange._id;
                originalStock.stockNum -= parseInt(orderNum);
                exchangeStock.stockNum += parseInt(orderNum);
                await cart.save();
                await originalStock.save();
                await exchangeStock.save();
                res.status(201).json({ message: '교환 신청이 성공적으로 이루어졌습니다.' });
            }
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 소비자가 환불 신청하기
export const refund = async (req: Request, res: Response, next: NextFunction) => {
    const { cartId, productId, orderNum, refundColor, refundSize, deliveryId, deliveryFirm, deliveryNumber, deliveryFee, bankName, accountNum, reason, content } = req.body;
    const file = req.file as Express.Multer.File;
    const image: string = file ? file.location : '';
    try {
        const cart: CartDocument | null = await Cart.findById(cartId);
        const refundStock: StockDocument | null = await Stock.findOne({ color: refundColor, size: refundSize, productId });
        if (!cart) {
            res.status(400).json({ message: '해당하는 아이디의 주문이 존재하지 않습니다. 환불에 실패했습니다.' });
        } else if (cart.status === '구매 확정') {
            res.status(400).json({ message: '해당하는 아이디의 주문은 이미 구매 확정된 상태입니다. 환불이 불가능합니다.' });
        } else {
            if (!refundStock) {
                res.status(400).json({ message: '해당하는 옵션의 재고가 존재하지 않습니다. 환불에 실패했습니다.' });
            } else {
                const refund: RefundDocument = await Refund.create({
                    cartId,
                    deliveryId,
                    deliveryFirm,
                    deliveryNumber,
                    deliveryFee,
                    bankName,
                    accountNum,
                    reason,
                    content,
                    image
                });
                cart.status = '환불 신청';
                cart.refundId = refund._id;
                refundStock.stockNum += parseInt(orderNum);
                await cart.save();
                await refundStock.save();
                res.status(201).json({ message: '환불 신청이 성공적으로 이루어졌습니다.' });
            }
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 판매자가 교환 내용 조회하기
export const getExchangeInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { exchangeId } = req.params;
    try {
        const exchange: ExchangeDocument | null = await Exchange.findById(exchangeId);
        if (exchange) res.status(200).json(exchange);
        else res.status(200).json({ message: '해당하는 아이디의 교환정보가 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 판매자가 환불 내용 조회하기
export const getRefundInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { refundId } = req.params;
    try {
        const refund: RefundDocument | null = await Refund.findById(refundId);
        if (refund) res.status(200).json(refund);
        else res.status(200).json({ message: '해당하는 아이디의 교환정보가 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 사용자의 교환&환불 목록 조회하기 
export const getReturnList = async (req: Request, res: Response, next: NextFunction) => {
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    // eslint-disable-next-line no-var
    var cartList: IResponseCart[] = [];
    let cart: IResponseCart;
    const returnOrderList: IResponseOrder[] = [];
    let returnOrder: IResponseOrder;
    try {
        const returnCartList: CartDocument[] = await Cart.find({ userId, status: { $in: ['교환 신청', '환불 신청', '교환 중', '교환 완료', '환불 완료'] } }).sort('-createdAt');
        const returnOrderIdList: string[] = returnCartList
            .map(cart => cart.orderId.toString())
            .filter((item, index, arr) => arr.indexOf(item) === index);

        const getProducts = async (cartList: any) => { 
            const promises = cartList.map((cart: CartDocument) => {
                const { productId } = cart;
                const product = Product.findById(productId).select('-_id mainImages marketName name');
                if (product) return product; 
            });
            return await Promise.all(promises); 
        };
        for (let i = 0; i < returnOrderIdList.length; i++) {
            const order: any = await Order.findById(returnOrderIdList[i]).select('-_id cartIdList createdAt').populate('cartIdList');
            if (order) {
                const { cartIdList } = order;
                const productList: any = await getProducts(cartIdList);
                for (let j = 0; j < cartIdList.length; j++) {
                    if (['교환 신청', '환불 신청', '교환 중', '교환 완료', '환불 완료'].includes(cartIdList[j].status)) {
                        if (cartIdList[j].status === '교환 중') {
                            let status: string;
                            const exchange: ExchangeDocument | null = await Exchange.findById(cartIdList[j].exchangeId);
                            const deliveryInfo = await axios.get(`https://apis.tracker.delivery/carriers/${exchange?.deliveryId}/tracks/${exchange?.deliveryNumber}`);
                            if (deliveryInfo.data.state.id === 'delivered') {
                                status = '교환 완료';
                                cartIdList[j].status = '교환 완료';
                                cartIdList[j].deliveryCompleteDate = new Date();
                                await cartIdList[j].save();
                            } else {
                                status = '교환 중';
                            }
                            cart = {
                                cartId: cartIdList[j]._id,
                                color: cartIdList[j].color,
                                size: cartIdList[j].size,
                                orderNum: cartIdList[j].orderNum,
                                orderPrice: cartIdList[j].orderPrice,
                                mainImage: productList[j].mainImages[0],
                                marketName: productList[j].marketName,
                                productName: productList[j].name,
                                status,
                                exchangeId: cartIdList[j].exchangeId,
                                refundId: cartIdList[j].refundId,
                            };
                        } else {
                            cart = {
                                cartId: cartIdList[j]._id,
                                color: cartIdList[j].color,
                                size: cartIdList[j].size,
                                orderNum: cartIdList[j].orderNum,
                                orderPrice: cartIdList[j].orderPrice,
                                mainImage: productList[j].mainImages[0],
                                marketName: productList[j].marketName,
                                productName: productList[j].name,
                                status: cartIdList[j].status,
                                exchangeId: cartIdList[j].exchangeId,
                                refundId: cartIdList[j].refundId,
                            };
                        }
                        cartList.push(cart);
                    }
                }
                returnOrder = {
                    orderId: returnOrderIdList[i],
                    orderDate: order.createdAt,
                    cart: cartList
                };
                returnOrderList.push(returnOrder);
                cartList = [];
            }
        }
        res.status(200).json(returnOrderList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 판매자가 교환 또는 환불 완료하기
export const completeReturn = async (req: Request, res: Response, next: NextFunction) => {
    const { cartId, deliveryId, deliveryFirm, deliveryNumber } = req.body;
    try {
        if (deliveryNumber && deliveryFirm && deliveryId) {
            const cart: CartDocument | null = await Cart.findByIdAndUpdate(cartId, {
                deliveryId,
                deliveryNumber,
                deliveryFirm,
                status: '교환 중'
            });
            if (cart) res.status(201).json({ message: '교환 완료되었습니다.' });
            else res.status(400).json({ message: '해당 아이디의 주문내역이 존재하지 않습니다.' });
        } else {
            const cart: CartDocument | null = await Cart.findByIdAndUpdate(cartId, {
                status: '환불 완료'
            });
            if (cart) res.status(201).json({ message: '환불 완료되었습니다.' });
            else res.status(400).json({ message: '해당 아이디의 주문내역이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};
