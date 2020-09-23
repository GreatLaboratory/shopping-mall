import { Router } from 'express';

import { modifyCoupon, couponDetail, couponListForUser, couponListForMarket, giveCouponToUser, findUserByEmail, createCoupon, usingHistoryForAdmin, deleteCoupon, withdrawCoupon, availableCouponList, findMarketByName, blockOverlappedGiving } from '../controllers/couponController';
import { verifyJwtToken } from './middleWares/authValidation';

class BenefitRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 관리자가 쿠폰 생성하기 (마켓상품일 경우 자동 지급)
        this.router.post('/', createCoupon);

        // 관리자가 쿠폰 정보 수정하기
        this.router.put('/:couponId', modifyCoupon);

        // 소비자에게 쿠폰 지급하기 (관리자 || 마켓)
        this.router.put('/assign/:couponId', blockOverlappedGiving, giveCouponToUser);

        // 쿠폰 상세 조회하기
        this.router.get('/detail/:couponId', couponDetail);

        // 사용자가 보유 쿠폰 목록 조회하기
        this.router.get('/listForUser', verifyJwtToken, couponListForUser);

        // 마켓이 보유 쿠폰 목록 조회하기
        this.router.get('/listForAdmin', couponListForMarket);
        
        // 특정 쿠폰의 사용내역 조회하기
        this.router.get('/usingHistory/:couponId', usingHistoryForAdmin);
        
        // 사용자 이메일로 사용자 정보 검색 조회
        this.router.get('/searchUser/:email', findUserByEmail);
        
        // 마켓 이름으로 마켓 정보 검색 조회
        this.router.get('/searchMarket/:name', findMarketByName);

        // 쿠폰 삭제하기
        this.router.delete('/:couponId', deleteCoupon);
        
        // 지급 회수하기
        this.router.put('/withdraw/:couponId', withdrawCoupon);

        // 주문하려는 제품의 사용가능한 쿠폰 리스트 조회하기
        this.router.get('/availableCouponList', verifyJwtToken, availableCouponList);
    }
}

const benefitRouter = new BenefitRouter();
export default benefitRouter.router;
