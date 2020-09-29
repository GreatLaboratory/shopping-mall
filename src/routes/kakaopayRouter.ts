/* eslint-disable @typescript-eslint/camelcase */
import axios, { AxiosRequestConfig } from 'axios';
import { Router, Request, Response, NextFunction } from 'express';
import querystring from 'querystring';

import { KAKAO_ADMIN_KEY, KAKAOPAY_CID_KEY } from '../config/secret';

class KakaopayRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 카카오페이 결제 준비하기
        this.router.post('/', async (req: Request, res: Response, next: NextFunction) => {
            const { partner_order_id, partner_user_id, item_name, quantity, total_amount, tax_free_amount, approval_url, cancel_url, fail_url } = req.body;
            const header: AxiosRequestConfig = { headers: {
                'Authorization': `KakaoAK ${KAKAO_ADMIN_KEY}`,
                'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            }};
            try {
                const result = await axios.post('https://kapi.kakao.com/v1/payment/ready', querystring.stringify({
                    cid: KAKAOPAY_CID_KEY, // 맨즈바이 가맹점 코드
                    partner_order_id, // 주문 번호
                    partner_user_id, // 유저 id
                    item_name, // 상품 이름
                    quantity, // 수량
                    total_amount, // 가격
                    tax_free_amount, // 상품 비과세 금액
                    approval_url, // 성공 url
                    cancel_url, // 취소 url
                    fail_url// 실패 url
                }), header);
                res.status(201).json(result.data);
            } catch (err) {
                console.log(err);
                next(err);
            }
        });

        // 카카오페이 결제 완료하기
        this.router.post('/complete', async (req: Request, res: Response, next: NextFunction) => {
            const { partner_order_id, partner_user_id, pg_token, tid } = req.body;
            const header: AxiosRequestConfig = { headers: {
                'Authorization': `KakaoAK ${KAKAO_ADMIN_KEY}`,
                'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            }};
            try {
                const result = await axios.post('https://kapi.kakao.com/v1/payment/approve', querystring.stringify({
                    cid: KAKAOPAY_CID_KEY,
                    partner_order_id,
                    partner_user_id,
                    pg_token,
                    tid,
                }), header);
                res.status(201).json(result.data);
            } catch (err) {
                console.log(err);
                next(err);
            }
        });
    }
}

const kakaopayRouter = new KakaopayRouter();
export default kakaopayRouter.router;
