var GameLayer = cc.Layer.extend({

    _bgImg: null,

    _menu: null,
    _btnStart: null,

    _stageList: [],
    _stageWd: 0,
    _stageHg: 0,
    _stageY: 0,
    _stageStartX: 120,
    _curStage: null,
    _curStageIndex: 0,
    _curStageScaleWd: 0,

    _playerCtrl: null,
    _playerSpr: null,

    _stickList: [],
    _curStick: null,
    _curStickIndex: null,
    _curStickHg: 0,

    _stick: null,
    _stickHg: 0,
    _isStickReady: false,

    _score: 0,

    _gameOverLayer: null,

    ctor: function () {
        this._super();
        this._init();
    },
    _init: function () {

        var _this = this;

        // 添加随机背景图
        var bgImgIndex = Math.floor(cc.random0To1() * 4);
        var bgImg = new cc.Sprite(res['bg' + bgImgIndex + '_png']);
        bgImg.setScale(1.1);
        bgImg.x = cc.winSize.width / 2;
        bgImg.y = cc.winSize.height / 2;
        _this.addChild(bgImg);
        _this._bgImg = bgImg;

        // 添加开始按钮
        var btnStart = new cc.MenuItemImage(
            res.btnStartNormal_png,
            res.btnStartSelect_png,
            _this.start,
            _this
        );
        var btnMenu = new cc.Menu();
        btnMenu.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
        btnMenu.addChild(btnStart);
        _this.addChild(btnMenu);
        _this._menu = btnMenu;
        _this._btnStart = btnStart;

        // 添加三个平台
        for(var i = 0; i < 3; i++){
            var stageTmp = new cc.Sprite(res.black_png);
            stageTmp.x = cc.winSize.width + stageTmp.width / 2;
            stageTmp.y = stageTmp.height / 2;
            if(0 == i){
                stageTmp.setScaleX(30);
                stageTmp.x = cc.winSize.width / 2;
                // 设置全局平台信息
                _this._stageWd = stageTmp.width;
                _this._stageHg = stageTmp.height;
                _this._stageY = stageTmp.y;
                // 设置当前平台信息
                _this._curStageIndex = 0;
                _this._curStage = stageTmp;
                _this._curStageScaleWd = stageTmp.width * stageTmp.getScaleX();
            }
            _this.addChild(stageTmp, 3);
            _this._stageList[i] = stageTmp;
        }

        // 添加三根棍子
        for(var i = 0; i < 3; i++){
            var stickTmp = new cc.Sprite(res.black_png);
            stickTmp.setScaleY(0);
            stickTmp.setAnchorPoint(0.5, 0);
            stickTmp.x = - stageTmp.width;
            stickTmp.y = _this._stageHg;
            _this.addChild(stickTmp, 3);
            _this._stickList[i] = stickTmp;
            if(0 == i){
                // 设置当前棍子信息
                _this._curStickIndex = 0;
                _this._curStick = stickTmp;
            }
        }


        // 添加角色
        var playerCtrl = Player.init();
        var playerSpr = playerCtrl.getPlayerSprite();
        playerSpr.x = cc.winSize.width / 2;
        playerSpr.y = _this._stageHg;
        playerCtrl.setPlayerStanding();
        _this.addChild(playerSpr);
        _this._playerCtrl = playerCtrl;
        _this._playerSpr = playerSpr;

        // 添加事件监听器
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                return _this._onTouchBegan.call(_this, touch, event);
            },
            onTouchEnded: function (touch, event) {
                _this._onTouchEnded.call(_this, touch, event);
            }
        }, this);
    },

    // 开始游戏
    start: function () {

        // 移除开始按钮
        this.removeChild(this._menu);

        // 移动当前平台
        this._moveCurStage();

        // 添加下个平台
        this._addNextStage();
    },

    _moveCurStage: function () {

        // 移动当前平台到开始位置
        this._curStage.runAction(cc.moveTo(0.2, this._stageStartX, this._stageY));

        // 移动主角到开始位置
        var moveToX = this._stageStartX + this._curStageScaleWd / 2 - this._playerSpr.width / 2;
        this._playerSpr.runAction(
            cc.sequence(
                cc.moveTo(0.2, moveToX, this._stageHg),
                cc.callFunc(function () {
                    // 初始化棍子
                    this._initStick();
                }, this)
            )
        );
    },

    _moveOldStage: function () {

        // 保存旧的平台
        var oldStage = this._curStage;
        var oldStageScaleWd = this._curStageScaleWd;

        // 保存旧的棍子
        var oldStick = this._curStick;

        // 更新当前平台信息
        this._curStageIndex = this._curStageIndex == 2 ? 0 : this._curStageIndex + 1;
        this._curStage = this._stageList[this._curStageIndex];
        this._curStageScaleWd = this._curStage.width * this._curStage.getScaleX();

        // 更新当前棍子信息
        this._curStickIndex = this._curStageIndex;
        this._curStick = this._stickList[this._curStickIndex];
        this._curStickHg = 0;

        // 移动旧的平台
        var oldMoveByX = - (this._curStage.x - this._stageStartX);
        oldStage.runAction(
            cc.sequence(
                cc.moveBy(0.2, oldMoveByX, 0),
                cc.callFunc(function () {
                    // 移动完成后，将旧的平台放到窗口右侧
                    oldStage.x = cc.winSize.width + oldStageScaleWd / 2;
                }, this)
            )
        );

        // 移动旧的棍子
        oldStick.runAction(cc.moveBy(0.2, oldMoveByX, 0));
    },

    _addNextStage: function () {

        // 获取下个平台
        var nextStageIndex = this._curStageIndex == 2 ? 0 : this._curStageIndex + 1;
        var nextStage = this._stageList[nextStageIndex];

        // 设置下个平台的随机宽度 2 ~ 30
        var randomScale = Math.floor(cc.random0To1() * 30);
        randomScale = randomScale ? randomScale : 2;
        nextStage.setScaleX(randomScale);
        console.log('下个平台的随机宽度' + randomScale);

        // 设置下个平台的随机位置
        var randomX = cc.winSize.width / 2;
        var nextStageMoveTo = new cc.MoveTo(0.3, randomX, this._stageY);
        nextStage.runAction(nextStageMoveTo);
        console.log('下个平台的随机位置' + randomX);
    },

    /**
     * 事件监听器方法
     */
    _onTouchBegan: function () {
        if(this._isStickReady){
            this._extendStick();
        }
        return true;
    },

    _onTouchEnded: function () {
        if(this._isStickReady){
            // 停止延长棍子
            this._unextendStick();
            // 旋转棍子
            this._rotateStick1();
        }
    },

    /**
     * 棍子方法
     */
    _initStick: function () {

        // 初始化棍子的角度和位置
        this._curStick.setRotation(0);
        this._curStick.setScaleY(0);
        this._curStick.x = this._stageStartX + this._curStageScaleWd / 2;
        this._curStickHg = 0;

        // 标记棍子已就绪
        this._isStickReady = true;
    },
    _extendStick: function () {
        this.schedule(this._extendStickCallback, 0.02);
    },
    _extendStickCallback: function () {
        this._curStick.setScaleY(this._curStick.scaleY + 0.07);
    },
    _unextendStick: function () {
        this.unschedule(this._extendStickCallback);
        this._curStickHg = this._curStick.height * this._curStick.getScaleY();
        this._isStickReady = false;
    },
    _rotateStick1: function () {
        var _this = this;
        _this._curStick.runAction(
            cc.sequence(
                cc.delayTime(0.3),
                cc.rotateBy(0.1, 90),
                cc.callFunc(_this._movePlayer, _this)
            )
        );
    },

    /**
     * 角色方法
     */
    _movePlayer: function () {

        var tagetStageIndex = this._curStageIndex == 2 ? 0 : this._curStageIndex + 1;
        var tagetStage = this._stageList[tagetStageIndex];
        var tagetStageScaleWd = tagetStage.width * tagetStage.getScaleX();

        var moveDistanceMin = tagetStage.x - tagetStageScaleWd / 2  - this._stageStartX - this._curStageScaleWd / 2;
        var moveDistanceMax = moveDistanceMin + tagetStageScaleWd;
        var moveDistance = 0;

        if(this._curStickHg < moveDistanceMin){
            moveDistance = this._curStickHg;
            console.log('太短了，移动到' + moveDistance + '时，角色掉下');
            this._fallStickAndPlayer(moveDistance);
        }else if(this._curStickHg > moveDistanceMax){
            moveDistance = moveDistanceMax;
            console.log('太长了，移动到' + moveDistance + '时，角色掉下');
            this._fallStickAndPlayer(moveDistance);
        }else{
            moveDistance = moveDistanceMax - this._stageWd;
            console.log('刚刚好，移动到' + moveDistance + '时，角色停下，移动平台');

            // 分数加一
            this._score++;

            // 移动旧的平台
            this._moveOldStage();

            // 移动当前平台
            this._moveCurStage();

            // 添加下个平台
            this._addNextStage();

            // 初始化棍子
            this._initStick();
        }
    },
    _fallStickAndPlayer: function (moveDistance) {

        var moveByX = moveDistance + this._playerSpr.width / 2;

        this._playerSpr.runAction(
            cc.sequence(
                cc.moveBy(0.2, moveByX, 0),
                cc.callFunc(function () {

                    // 棍子掉落
                    this._curStick.runAction(cc.rotateBy(0.1, 90));

                    // 角色掉落
                    this._playerSpr.runAction(
                        cc.sequence(
                            cc.moveBy(0.3, 0, - (this._stageHg + this._playerSpr.height)),
                            cc.callFunc(function () {
                                // 震动背景层
                                this._bgImg.runAction(cc.jumpBy(0.2, cc.p(0, 0), 10, 2));
                                // 显示游戏结束层
                                this._showGameOverLayer();
                            }, this)
                        )
                    );

                }, this)
            )
        );
    },

    /**
     * 游戏结束层
     */
    _showGameOverLayer: function () {
        this._gameOverLayer = new GameOverLayer();
        this._gameOverLayer.showScore(this._score);
        this.addChild(this._gameOverLayer);
    }
});