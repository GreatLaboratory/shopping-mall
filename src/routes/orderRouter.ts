import { Router } from 'express';

import { addOrder, addDeliveryInfo, addCart, getCartList, getAddressHistory, cancelOrder, deleteCart, checkStock, orderListForUser, orderListForAdmin, orderList, calculatePrice, finalizePurchase, isIsolatedRegion, getOrderPriceDetailList } from '../controllers/orderController';
import { verifyJwtToken } from './middleWares/authValidation';

class OrderRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 장바구니에 담기
        this.router.post('/addCart', verifyJwtToken, addCart);
        
        // 장바구니 목록 조회하기
        this.router.get('/cartList', verifyJwtToken, getCartList);
        
        // 장바구니 삭제하기
        this.router.delete('/cart/:cartId', deleteCart);

        // 주문하기
        this.router.post('/', verifyJwtToken, checkStock, addOrder);

        // 운송장 번호 입력 및 변경하기
        this.router.post('/addDeliveryInfo', addDeliveryInfo);

        // 주문 시 이전 배송지정보 조회하기
        this.router.get('/addressList', verifyJwtToken, getAddressHistory);
        
        // 주문 취소하기
        this.router.get('/cancel/:cartId', cancelOrder);

        // 로그인된 사용자의 주문 목록 조회하기
        this.router.get('/list/forUser/:page', verifyJwtToken, orderListForUser);
        
        // 입점관리자 또는 슈퍼관리자 웹패널에서 주문 목록 조회하기
        this.router.get('/list/forAdmin/:page', orderListForAdmin);
        
        // 주문 내용 상세 조회하기
        this.router.get('/:cartId', orderList);
        
        // 주문 최종 금액 검증하기
        this.router.post('/price', calculatePrice);
        
        // 구매확정하기
        this.router.put('/finalizePurchase', finalizePurchase);
        
        // 도서산간 지역 검증하기
        this.router.post('/isIsolatedRegion', isIsolatedRegion);
        
        // 판매자 패널에서 주문 결제 금액 상세 조회하기
        this.router.get('/forAdmin/:orderId/:marketId', getOrderPriceDetailList);
    }
}

const orderRouter = new OrderRouter();
export default orderRouter.router;
