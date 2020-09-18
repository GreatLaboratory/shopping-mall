import { Router } from 'express';

import { login, findEmail, signUp, resetPassword, changeUserData, deleteUser, likeThisMarketOrNot, likeThisProductOrNot, getLikedProductList, getLikedMarketList, getPointList, getPoint, sendCodeToPhone, verifyCode, kakao, passportLocalLogin, passportJwtLogin, currentUser, apple, setFCMToken } from '../controllers/userController';
import { verifyJwtToken } from './middleWares/authValidation';

class UserRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // FCM 토큰 저장하기
        this.router.post('/setFCMToken', verifyJwtToken, setFCMToken);

        // 사용자 애플 로그인하기
        this.router.post('/apple', apple, login);

        // 사용자 카카오톡 로그인하기
        this.router.post('/kakao', kakao, login);

        // 사용자 로컬 로그인하기
        this.router.post('/login', passportLocalLogin, login);

        // 현재 사용자 정보 확인하기
        this.router.get('/current', passportJwtLogin, currentUser);

        // 사용자 회원가입하기
        this.router.post('/signUp', signUp);

        // 이메일 찾기
        this.router.post('/findEmail', findEmail);

        // 비밀번호 찾기
        this.router.post('/resetPassword', resetPassword);

        // 사용자 정보 수정하기
        this.router.post('/changeUserData', verifyJwtToken, changeUserData);

        // 회원 탈퇴하기
        this.router.delete('/', verifyJwtToken, deleteUser);

        // 상품 좋아요 누르기 || 취소하기
        this.router.post('/likeThisProductOrNot', verifyJwtToken, likeThisProductOrNot);
        
        // 마켓 좋아요 누르기 || 취소하기
        this.router.post('/likeThisMarketOrNot', verifyJwtToken, likeThisMarketOrNot);

        // 좋아요 누른 상품 조회하기
        this.router.get('/getLikedProductList', verifyJwtToken, getLikedProductList);

        // 좋아요 누른 마켓 조회하기
        this.router.get('/getLikedMarketList', verifyJwtToken, getLikedMarketList);

        // 적립금 사용내역 조회하기
        this.router.get('/pointList', verifyJwtToken, getPointList);
        
        // 적립금 조회하기
        this.router.get('/point', verifyJwtToken, getPoint);
        
        // 핸드폰 번호 인증번호 발송
        this.router.post('/auth/sendCode', sendCodeToPhone);

        // 인증번호 인증
        this.router.post('/auth/verifyCode', verifyCode);
    }
}

const userRouter = new UserRouter();
export default userRouter.router;
