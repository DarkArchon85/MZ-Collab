// ============================================================================
//  LordValinar Plugin - Latest in the GTBS testing
//  Test.js
// ============================================================================

var Imported = Imported || {};
Imported["Test"] = true;

/*:
 * @target MZ
 * @plugindesc [v1.0] 
 * @author LordValinar
 * @url https://github.com/DarkArchon85/RMMZ-Plugins
 *
 * @param spawnZoneId
 * @text Enemy Spawn Zone
 * @type number
 * @min 1
 * @max 255
 * @desc 
 * @default 69
 *
 * @param initFormula
 * @text Initiative Formula
 * @desc 
 * @default (this.agi - 10) + Math.randomInt(100)
 *
 * @param spawnRadius
 * @text Deployment Radius
 * @type number
 * @desc 
 * @default 3
 *
 * @param searchLimit
 * @type number
 * @desc This is the distance limit for pathfinding when the 
 * flag is turned on. RM Default: 12
 * @default 24
 *
 * @help
 * ----------------------------------------------------------------------------
 * Instructions
 * ----------------------------------------------------------------------------
 *
 *
 *
 * ----------------------------------------------------------------------------
 * Terms of Use
 * ----------------------------------------------------------------------------
 *
 * Free to use and modify for commercial and noncommercial games, with credit.
 * Do NOT remove my name from the Author of this plugin
 * Do NOT reupload this plugin (modified or otherwise) anywhere other than the 
 * RPG Maker MV main forums: https://forums.rpgmakerweb.com/index.php
 *
 * ----------------------------------------------------------------------------
 * Changelog
 * ----------------------------------------------------------------------------
 *
 * v1.0 - Plugin finished!
 *
 * ----------------------------------------------------------------------------
 */

(() => {
'use strict';

const pluginName = 'Test';
const params = PluginManager.parameters(pluginName);
const szID = Number(params['spawnZoneId']);
const nLimit = Number(params['searchLimit']);

// --- Global Variables -------------------------------------------------------
let movementSearchLimitFlag = false;
let battleEvents = [];

/******************************************************************************
	plugin commands
******************************************************************************/
//PluginManager.registerCommand(pluginName, '', args => {});

/******************************************************************************
	rmmz_managers.js
******************************************************************************/

/******************************************************************************
	rmmz_objects.js
******************************************************************************/

// --- GAME BATTLER -----------------------------------------------------------
Game_Battler.prototype.initiative = function() {
	let formula = params['initFormula'];
	try {
		const vTag = /V\[(\d+)\]/gi; // variable replacement
		formula = formula.replace(vTag, (_, p1) => {
			return $gameVariables.value(parseInt(p1));
		});
        const value = Math.max(Math.floor(eval(formula)), 0);
        return isNaN(value) ? 0 : value;
    } catch (e) {
        return 0;
    }
};

// --- GAME ENEMY -------------------------------------------------------------
Game_Enemy.prototype.linkEvent = function(event) {
	this._event = event;
	event.linkBattler(this); // Noble_Event objects
};

Game_Enemy.prototype.event = function() {
	return this._event;
};

// --- GAME TROOP -------------------------------------------------------------
// Overwrite - Integrades new data
Game_Troop.prototype.setup = function(troopId) {
	this.clear();
	this._troopId = troopId;
	const data = this.createEventData();
	for (const enemyId in data) {
		const e = data[enemyId];
		const x = e.screenX();
		const y = e.screenY();
		const enemy = new Game_Enemy(enemyId, x, y);
		enemy.linkEvent(e);
		if (member.hidden) {
			enemy.hide();
		}
		this._enemies.push(enemy);
    }
    //this.makeUniqueNames();
};

// * Sets up a custom "events.json" (sort of) for new events 
//   used as battlers. When an enemy dies, or combat is over,
//   that event - all battleEvents - are removed
Game_Troop.prototype.createEventData = function() {
	const data = {};
	const unit = $gamePlayer;
	const regionID = $gameMap.regionId(unit.x, unit.y) || szID;
	const sz = $gameMap.spawnZone(regionID);
	battleEvents = [];
	for (const member of this.troop().members) {
		const i = Math.randomInt(sz.length);
		const enemyId = member.enemyId;
		const x = sz[i][0];
        const y = sz[i][1];
		const enemy = $dataEnemies[enemyId];
        if (enemy) {
            // -- Create New Event Data --
			const dataBattler = [
				enemyId, x, y, enemy.name, "<enemy>"
			];
			const battlerImage = getBattlerMeta(enemyId);
			const edit = {
				characterIndex: battlerImage[0],
				characterName: battlerImage[1],
				direction: getDirectionToPlayer(x, y),
				pattern: 1,
				tileId: 0
			};
			const params = [['image', edit]]; // edits 'image' field
			const event = createCustomEvent([dataBattler, params]);
			
			// add battler (event) to return
			data[enemyId] = event;
			
			// -- Remove Grid From SpawnZone (prevents doubles) --
			sz.splice(i, 1);
        }
	}
	return data;
};

// --- GAME MAP ---------------------------------------------------------------
// * Creates and returns a spawn zone array
Game_Map.prototype.spawnZone = function(regionId) {
	const zone = [];
	for (let x = 0; x < this.width(); x++) {
		for (let y = 0; y < this.height(); y++) {
			if (this.regionId(x,y) !== regionId) continue;
			zone.push([x,y]);
		}
	}
	return zone;
};

// --- GAME CHARACTER ---------------------------------------------------------
//Custom - Calculates the distance between a Game_Character and a goal Tile; returns distance or -1 if not possible
Game_Character.prototype.getDistanceFrom = function(goalX, goalY) {
    const searchLimit = this.searchLimit();
    const mapWidth = $gameMap.width();
    const nodeList = [];
    const openList = [];
    const closedList = [];
    const start = {};
    let best = start;

    if (this.x === goalX && this.y === goalY) {
        return 0;
    }

    start.parent = null;
    start.x = this.x;
    start.y = this.y;
    start.g = 0;
    start.f = $gameMap.distance(start.x, start.y, goalX, goalY);
    nodeList.push(start);
    openList.push(start.y * mapWidth + start.x);

    while (nodeList.length > 0) {
        let bestIndex = 0;
        for (let i = 0; i < nodeList.length; i++) {
            if (nodeList[i].f < nodeList[bestIndex].f) {
                bestIndex = i;
            }
        }

        const current = nodeList[bestIndex];
        const x1 = current.x;
        const y1 = current.y;
        const pos1 = y1 * mapWidth + x1;
        const g1 = current.g;

        nodeList.splice(bestIndex, 1);
        openList.splice(openList.indexOf(pos1), 1);
        closedList.push(pos1);

        if (current.x === goalX && current.y === goalY) {
            best = current;
            return best.f
        }

        if (g1 >= searchLimit) {
            continue;
        }

        for (let j = 0; j < 4; j++) {
            const direction = 2 + j * 2;
            const x2 = $gameMap.roundXWithDirection(x1, direction);
            const y2 = $gameMap.roundYWithDirection(y1, direction);
            const pos2 = y2 * mapWidth + x2;

            if (closedList.includes(pos2)) {
                continue;
            }
            if (!this.canPass(x1, y1, direction)) {
                continue;
            }

            const g2 = g1 + 1;
            const index2 = openList.indexOf(pos2);

            if (index2 < 0 || g2 < nodeList[index2].g) {
                let neighbor = {};
                if (index2 >= 0) {
                    neighbor = nodeList[index2];
                } else {
                    nodeList.push(neighbor);
                    openList.push(pos2);
                }
                neighbor.parent = current;
                neighbor.x = x2;
                neighbor.y = y2;
                neighbor.g = g2;
                neighbor.f = g2 + $gameMap.distance(x2, y2, goalX, goalY);
                if (!best || neighbor.f - neighbor.g < best.f - best.g) {
                    best = neighbor;
                }
            }
        }
    }
	return -1;
}

// Overwrite - Returns new param when flag is active
Game_Character.prototype.searchLimit = function() {
	return movementSearchLimitFlag ? nLimit : 12;
};

// --- GAME PLAYER ------------------------------------------------------------
// Alias - Disable movement in battle if not your turn.
const gamePlayer_canMove = Game_Player.prototype.canMove;
Game_Player.prototype.canMove = function() {
	const result = gamePlayer_canMove.call(this);
	if ($gameParty.inBattle() && !GTBS.isMoving()) {
		return false;
	}
	return result;
};

// --- GAME FOLLOWERS ---------------------------------------------------------
// Alias - Disable follower movement while in battle
const gameFollowers_updateMove = Game_Followers.prototype.updateMove;
Game_Followers.prototype.updateMove = function() {
	if (!$gameParty.inBattle()) {
		gameFollowers_updateMove.call(this);
	}
};

// --- GAME INTERPRETER -------------------------------------------------------
// Battle Processing
Game_Interpreter.prototype.command301 = function(params) {
    if (!$gameParty.inBattle()) {
        let troopId;
        if (params[0] === 0) {
            // Direct designation
            troopId = params[1];
        } else if (params[0] === 1) {
            // Designation with a variable
            troopId = $gameVariables.value(params[1]);
        } else {
            // Same as Random Encounters
            troopId = $gamePlayer.makeEncounterTroopId();
        }
        if ($dataTroops[troopId]) {
            GTBS.setup(troopId, params[2], params[3]);
            GTBS.setEventCallback(n => {
                this._branch[this._indent] = n;
            });
			$gameSystem.disableMenu();
            $gamePlayer.makeEncounterCount();
            SceneManager.goto(GTBS_BattleScene);
        }
    }
    return true;
};

// --- NOBLE EVENT ------------------------------------------------------------
function Noble_Event() {
	this.initialize(...arguments);
}

Noble_Event.prototype = Object.create(Game_Event.prototype);
Noble_Event.prototype.constructor = Noble_Event;

Object.defineProperty(Noble_Event.prototype, "spd", {
	get: function() {
		return this._moveSpeed + 1;
	}, 
	configurable: true
});

Noble_Event.prototype.initialize = function(mapId, eventId) {
	Game_Event.prototype.initialize.call(this, mapId, eventId);
};

Noble_Event.prototype.linkBattler = function(battler) {
	this._battler = battler; // Game_Enemy objects
};

Noble_Event.prototype.battler = function() {
	return this._battler;
};

Noble_Event.prototype.event = function() {
	return battleEvents[this._eventId];
};

/******************************************************************************
	rmmz_scenes.js
******************************************************************************/

// --- SCENE MAP --------------------------------------------------------------
// Overwrite - Redirect(and alter) how GTBS is handled
Scene_Map.prototype.launchBattle = function() {
    GTBS.saveBgmAndBgs();
    this.stopAudioOnBattleStart();
    SoundManager.playBattleStart();
    this._mapNameWindow.hide();
};

// Overwrite - Alter (or disable) the encounter effect
Scene_Map.prototype.updateEncounterEffect = function() {
	//..
};

// --- SCENE BATTLE (GTBS) ----------------------------------------------------
function GTBS_BattleScene() {
	this.initialize(...arguments);
}

GTBS_BattleScene.prototype = Object.create(Scene_Map.prototype);
GTBS_BattleScene.prototype.constructor = Scene_Battle;

GTBS_BattleScene.prototype.initialize = function() {
	Scene_Map.prototype.initialize.call(this);
};

GTBS_BattleScene.prototype.start = function() {
    Scene_Message.prototype.start.call(this);
    SceneManager.clearStack();
	GTBS.playBattleBgm();
	this.startFadeIn(this.fadeSpeed(), false);
    this.menuCalling = false;
};

GTBS_BattleScene.prototype.update = function() {
    Scene_Message.prototype.update.call(this);
	this.updateDestination();
	this.updateMainMultiply();
    if (this.isSceneChangeOk()) {
        this.updateScene();
    }
    this.updateWaitCount();
};

GTBS_BattleScene.prototype.updateScene = function() {
    this.checkGameover();
    if (!SceneManager.isSceneChanging()) {
        this.updateTransferPlayer();
    }
    if (!SceneManager.isSceneChanging()) {
        this.updateCallDebug();
    }
};

GTBS_BattleScene.prototype.stop = function() {
    Scene_Message.prototype.stop.call(this);
    $gamePlayer.straighten();
    if (this.needsSlowFadeOut()) {
        this.startFadeOut(this.slowFadeSpeed(), false);
    } else if (SceneManager.isNextScene(Scene_Map)) {
        this.fadeOutForTransfer();
    }
};

GTBS_BattleScene.prototype.terminate = function() {
    Scene_Message.prototype.terminate.call(this);
    $gameParty.onBattleEnd();
    $gameTroop.onBattleEnd();
    AudioManager.stopMe();
    $gameScreen.clearZoom();
};

GTBS_BattleScene.prototype.createDisplayObjects = function() {
	this.createSpriteset();
    this.createWindowLayer();
    this.createAllWindows();
	// --
	//GTBS.setLogWindow(this._logWindow);
    //GTBS.setSpriteset(this._spriteset);
    //this._logWindow.setSpriteset(this._spriteset);
};

GTBS_BattleScene.prototype.createSpriteset = function() {
    this._spriteset = new Spriteset_GTBS();
    this.addChild(this._spriteset);
    this._spriteset.update();
};

GTBS_BattleScene.prototype.createAllWindows = function() {	
    //this.createLogWindow();
    //this.createStatusWindow();
    //this.createActorCommandWindow();
    //this.createHelpWindow();
    //this.createSkillWindow();
    //this.createItemWindow();
    //this.createActorWindow();
    this.createEnemyWindow();
    Scene_Message.prototype.createAllWindows.call(this);
	this.createDeploymentWindow();
	this.createInfoWindow();
	this.createDispatchWindow();
};

GTBS_BattleScene.prototype.createEnemyWindow = function() {
	const rect = this.createEnemyCardRect();
	this._enemyWindow = new Window_EnemyStatus(rect);
	this.addWindow(this._enemyWindow);
};

GTBS_BattleScene.prototype.createEnemyCardRect = function() {
	const ww = Graphics.width / 3;
	const wh = this.calcWindowHeight(5, false);
	const wx = (Graphics.width - ww) / 2;
	const wy = (Graphics.height - wh) / 2;
	return new Rectangle(wx, wy, ww, wh);
};

GTBS_BattleScene.prototype.createDeploymentWindow = function() {
	const rect = new Rectangle(0,0,Graphics.width,Graphics.height);
	this._deploymentWindow = new Window_Deployment(rect);
	this._deploymentWindow.setHandler('ok', this.deployOk.bind(this));
	this._deploymentWindow.setHandler('cancel', this.returnActor.bind(this));
	this.addWindow(this._deploymentWindow);
};

GTBS_BattleScene.prototype.deployOk = function(dispatched=true) {
	GTBS.clearGrid(true);
	this._infoWindow.open();
	this._dispatchWindow.open();
	if (dispatched) {
		this._dispatchWindow._dispatched++;
	}
	this._dispatchWindow.reactivate();
};

GTBS_BattleScene.prototype.returnActor = function() {
	const actor = this._deploymentWindow.actor();
	const sprite = this._spriteset.findTargetSprite(actor);
	if (sprite) {
		this._spriteset._characterSprites.remove(sprite);
		this._spriteset._tilemap.removeChild(sprite);
		sprite.destroy();
	}
	this.deployOk(false);
};

GTBS_BattleScene.prototype.createInfoWindow = function() {
	const rect = this.infoWindowRect();
	this._infoWindow = new Window_Info(rect);
	this.addWindow(this._infoWindow);
};

GTBS_BattleScene.prototype.infoWindowRect = function() {
	const wx = 212;
	const wy = 0;
	const ww = Graphics.width - wx;
	const wh = this.calcWindowHeight(2, false);
	return new Rectangle(wx, wy, ww, wh);
};

GTBS_BattleScene.prototype.createDispatchWindow = function() {
	const rect = this.dispatchWindowRect();
	this._dispatchWindow = new Window_Dispatch(rect);
	this._dispatchWindow.setHandler('actor', this.handleDispatch.bind(this));
	this._dispatchWindow.setHandler('finish', this.startBattle.bind(this));
	this.addWindow(this._dispatchWindow);
};

GTBS_BattleScene.prototype.dispatchWindowRect = function() {
	const wx = 0;
	const wy = 0;
	const ww = 212;
	const wh = Graphics.height;
	return new Rectangle(wx, wy, ww, wh);
};

GTBS_BattleScene.prototype.handleDispatch = function() {
	const index = $gameParty._actors[this._dispatchWindow.index()];
	this._dispatchWindow.deselect();
	this._dispatchWindow.deactivate();
	this._dispatchWindow.close();
	this._infoWindow.close();
	
	GTBS.setSpawn();
	const actor = this.getCharacter(index);
	try {
		const sprite = GTBS_Actor(actor);
		this._spriteset._characterSprites.push(sprite);
		this._spriteset._tilemap.addChild(sprite);
		this._deploymentWindow.setActor(actor);
	} catch(e) {
		console.log("Error -> Invalid actor");
	}
};

GTBS_BattleScene.prototype.getCharacter = function(index) {
	if (index === 0) return $gamePlayer;
	if (index > 0 && index < $gameParty.maxBattleMembers()) {
		const follower = $gamePlayer._followers._data[index-1];
		if (follower) {
			const startX = GTBS.startX(1);
			const startY = GTBS.startY(1);
			const startD = GTBS.startD();
			const charIndex = follower.actor().characterIndex();
			const charName = follower.actor().characterName();
			follower.locate(startX, startY);
			follower.setDirection(startD);
			follower.setImage(charName, charIndex);
			follower.setTransparent(false);
			follower.setThrough(false);
			return follower;
		}
	}
	return null;
};

GTBS_BattleScene.prototype.startBattle = function() {
	// TODO...
};

/******************************************************************************
	rmmz_sprites.js
******************************************************************************/
Sprite.prototype.isValidPhase = function(ext) {
	const phases = ["select","move","attack","skill","item"];
	return ext && ext.length > 0 
		? phases.concat(ext).contains(GTBS._phase)
		: phases.contains(GTBS._phase));
};

// --- SPRITE GRID ------------------------------------------------------------
function Sprite_Grid() {
	this.initialize(...arguments);
}

Sprite_Grid.prototype = Object.create(Sprite.prototype);
Sprite_Grid.prototype.constructor = Sprite_Grid;

Sprite_Grid.prototype.initialize = function() {
	this.initMembers();
	const w = $gameMap.width() * this._mult[0];
	const h = $gameMap.height() * this._mult[1];
	const bitmap = new Bitmap(w, h);
	Sprite.prototype.initialize.call(this, bitmap);
	this._battleField.addChild(this);
};

Sprite_Grid.prototype.initMembers = function() {
	this._character = GTBS.getUnit()._unit;
	this._grid = GTBS.getUnit()._gridData;
	this._mult = [$gameMap.tileWidth(), $gameMap.tileHeight()];
	this._battleField = SceneManager._scene._spriteset._tilemap;
};

Sprite_Grid.prototype.update = function() {
	this.updateBitmap();
	this.updatePosition();
};

Sprite_Grid.prototype.updateBitmap = function() {
	if (this.isValidPhase(["init"])) {// allowable phases
		if (!this._gridEnabled) {
			this.createGridLayer();
			this._gridEnabled = true;
		}
	}
};

Sprite_Grid.prototype.createGridLayer = function() {
	const unitType = GTBS.getUnit()._type;
	for (const grid of this._grid) {
		const x = 1 + grid[0] * this._mult[0];
		const y = 1 + grid[1] * this._mult[1];
		let color = '#0099cf85'; // blue (default)
		if (unitType === "enemy") {
			color = '#fc560365'; // red
		} else if (this._character.pos(grid[0], grid[1])) {
			color = '#e6de0085'; // yellow
		}
		this.bitmap.fillRect(x, y, 46, 46, color);
	}
};

Sprite_Grid.prototype.updatePosition = function() {
	this.x = -$gameMap._displayX * $gameMap.tileWidth();
	this.y = -$gameMap._displayY * $gameMap.tileHeight();
	this.z = 1;
};

Sprite_Grid.prototype.clear = function() {
	this.bitmap.destroy();
	this._gridEnabled = false;
};

// --- SPRITE CHARACTER (base) ------------------------------------------------
Sprite_Character.prototype.updateCharPosition = function(x, y) {
	const c = this._character;
	const d = c.reverseDir(getDirectionToPlayer(x, y));
	c.setDirection(d);
	c.locate(x, y);
};

// --- SPRITE SELECTOR --------------------------------------------------------
function Sprite_Selector() {
	this.initialize(...arguments);
}

Sprite_Selector.prototype = Object.create(Sprite.prototype);
Sprite_Selector.prototype.constructor = Sprite_Selector;

Sprite_Selector.prototype.initialize = function(character) {
	Sprite.prototype.initialize.call(this);
	this.anchor.x = 0.5;
	this.anchor.y = 0.87;
	this._character = character;
};

Sprite_Selector.prototype.update = function() {
	Sprite.prototype.update.call(this);
	this.updateBitmap();
	if (this.visible) {
		this.updatePosition();
		//this.updateOther();
	}
};

Sprite_Selector.prototype.updateBitmap = function() {
	if (this.isValidPhase()) {
		if (!this.bitmap) {
			this.bitmap = ImageManager.loadSystem("selector");
		}
		this.visible = true;
		this._character._through = true;
	} else {
		this.bitmap = null;
		this.visible = false;
		this._character._through = false;
	}
};

Sprite_Selector.prototype.updatePosition = function() {
	if (TouchInput.isHovered()) {
		const tx = $gameMap.canvasToMapX(TouchInput.x);
		const ty = $gameMap.canvasToMapY(TouchInput.y);
		this.updateCharPosition(tx, ty);
	}
	this.x = this._character.screenX();
	this.y = this._character.screenY();
	this.z = 2;
};

Sprite_Selector.prototype.updateOther = function() {
	const win = SceneManager._scene._enemyWindow;
	const c = this._character;
	const event = GTBS.event(c.x, c.y);
	if (event) {
		if (!win.active) { 
			win.open();
			win.setBattler(event); // setup and activate
			// create grid (so player can see enemy distance)
			const dist = event.spd + 1; // default: 5
			GTBS.setUnit(event, dist);
		}
	} else {
		GTBS.clearGrid();
		win.setBattler(null); // close and deactivate
		win.close();
	}
};

// --- SPRITE GHOST -----------------------------------------------------------
function Sprite_Ghost() {
	this.initialize(...arguments);
}

Sprite_Ghost.prototype = Object.create(Sprite_Character.prototype);
Sprite_Ghost.prototype.constructor = Sprite_Ghost;

Sprite_Ghost.prototype.initialize = function(character) {
	Sprite_Character.prototype.initialize.call(this, character);
};

Sprite_Ghost.prototype.inGrid = function(x, y) {
	x ??= this._character.x;
	y ??= this._character.y;
	return GTBS.getGrid().gridLoc(x, y);
};

Sprite_Ghost.prototype.update = function() {
	Sprite.prototype.update.call(this);
	this.updateBitmap();
	this.updatePosition();
	this.updateOther();
	this.updateVisibility();
};

Sprite_Ghost.prototype.updateBitmap = function() {
	if (GTBS.isSelector()) {
		Sprite_Character.prototype.updateBitmap.call(this);
	}
};

Sprite_Ghost.prototype.updatePosition = function() {
	const pass = () => {
		if (TouchInput.isHovered()) {
			const tx = $gameMap.canvasToMapX(TouchInput.x);
			const ty = $gameMap.canvasToMapY(TouchInput.y);
			if (this.inGrid(tx, ty)) {
				this.updateCharPosition(tx, ty);
				return true;
			}
		} else {
			return this.inGrid();
		}
	};
	if (GTBS.isSelector() && pass) {
		this.x = this._character.screenX();
		this.y = this._character.screenY();
		this.z = this._character.screenZ();
	}
};

Sprite_Ghost.prototype.updateOther = function() {
	this.opacity = 185;
    this.blendMode = this._character.blendMode();
    this._bushDepth = this._character.bushDepth();
};

Sprite_Ghost.prototype.updateVisibility = function() {
	Sprite_Character.prototype.updateVisibility.call(this);
	if (!this.isGhostValid()) this.visible = false;
};

Sprite_Ghost.prototype.isGhostValid = function() {
	if (!GTBS.isSelector()) return false;
	const sx = GTBS.startX(0);
	const sy = GTBS.startY(0);
	if (this.x === sx && this.y === sy) return false;
	return true;
};

// --- SPRITE ACTOR (GTBS) ----------------------------------------------------
function GTBS_Actor() {
	this.initialize(...arguments);
}

GTBS_Actor.prototype = Object.create(Sprite_Character.prototype);
GTBS_Actor.prototype.constructor = GTBS_Actor;

GTBS_Actor.prototype.initialize = function(character) {
	Sprite_Character.prototype.initialize.call(this, character);
	this.updateBitmap(); // quick update to prevent sprite glitch
};

GTBS_Actor.prototype.update = function() {
	Sprite.prototype.update.call(this);
	this.updateBitmap();
	this.updatePosition();
	this.updateVisibility();
};

GTBS_Actor.prototype.updatePosition = function() {
	const c = this._character;
	if (GTBS._phase === "init" || GTBS.isTurn(c)) {
		if (TouchInput.isHovered()) {
			const tx = $gameMap.canvasToMapX(TouchInput.x);
			const ty = $gameMap.canvasToMapY(TouchInput.y);
			this.updateCharPosition(tx, ty);
		}
		this.x = c.screenX();
		this.y = c.screenY();
		this.z = c.screenZ();
	}
};

GTBS_Actor.prototype.updateVisibility = function() {
	this.visible = this._character.hp > 0;
};

// --- SPRITESET BATTLE (GTBS) ------------------------------------------------
function Spriteset_GTBS() {
	this.initialize(...arguments);
}

Spriteset_GTBS.prototype = Object.create(Spriteset_Map.prototype);
Spriteset_GTBS.prototype.constructor = Spriteset_GTBS;

Spriteset_GTBS.prototype.initialize = function() {
	Spriteset_Map.prototype.initialize.call(this);
};

Spriteset_GTBS.prototype.createCharacters = function() {
	this._characterSprites = []; // for when adding actors
	this._enemySprites = [];
	for (const event of $gameMap.events()) {
		if (!event.meta.enemy && !event.meta.battle) continue;
		const sprite = new Sprite_Character(event);
        this._enemySprites.push(sprite);
		this._tilemap.addChild(sprite);
    }
};

/******************************************************************************
	rmmz_windows.js
******************************************************************************/

// --- WINDOW ENEMY_STATUS ----------------------------------------------------
function Window_EnemyStatus() {
	this.initialize(...arguments);
}

Window_EnemyStatus.prototype = Object.create(Window_StatusBase.prototype);
Window_EnemyStatus.prototype.constructor = Window_EnemyStatus;

Window_EnemyStatus.prototype.initialize = function(rect) {
	Window_StatusBase.prototype.initialize.call(this, rect);
	this._openness = 0;
	this.setBattler(null);
};

Window_EnemyStatus.prototype.setBattler = function(enemy) {
	if (!enemy) {
		this._battler = null;
		this.deactivate();
	} else {
		this._battler = enemy;
		this.refresh();
		this.activate();
	}
};

Window_EnemyStatus.prototype.refresh = function() {
	this.contents.clear();
	if (!this._battler) return;
	this.drawStatusRects();
	// .. 
};

Window_EnemyStatus.prototype.drawStatusRects = function() {
	// Enemy 
	const lh = this.lineHeight();
	let rect = new Rectangle(0, 0, this.innerWidth, 56);
	this.drawDarkRect(rect.x, rect.y, rect.width, rect.height);
	rect.y += (lh * 2);
	rect.height = this.innerHeight - (lh*2) - 56;
	this.drawDarkRect(rect.x, rect.y, rect.width, rect.height);
};

Window_EnemyStatus.prototype.drawDarkRect = function(x, y, width, height) {
	const color = ColorManager.gaugeBackColor();
	this.changePaintOpacity(false);
	this.contents.fillRect(x + 1, y + 1, width - 2, height - 2, color);
	this.changePaintOpacity(true);
};

// --- WINDOW DEPLOYMENT ------------------------------------------------------
// * A "dummy" window to set handlers for deploying actors 
function Window_Deployment() {
	this.initialize(...arguments);
}

Window_Deployment.prototype = Object.create(Window_Selectable.prototype);
Window_Deployment.prototype.constructor = Window_Deployment;

Window_Deployment.prototype.initialize = function(rect) {
	Window_Selectable.prototype.initialize.call(this, rect);
	this.opacity = 0;
	this.setActor(null);
};

Window_Deployment.prototype.setActor = function(actor) {
	if (!actor) {
		this._actor = null;
		this.deactivate();
	} else {
		this._actor = actor;
		this.activate();
	}
};

Window_Deployment.prototype.actor = function() {
	return this._actor;
};

// --- WINDOW DISPATCH --------------------------------------------------------
function Window_Dispatch() {
	this.initialize(...arguments);
}

Window_Dispatch.prototype = Object.create(Window_Command.prototype);
Window_Dispatch.prototype.constructor = Window_Dispatch;

Window_Dispatch.prototype.initialize = function(rect) {
	Window_Command.prototype.initialize.call(this, rect);
	this._dispatched = 0;
};

Window_Dispatch.prototype.makeCommandList = function() {
	for (const actor of $gameParty.members()) {
		const enabled = !actor.isDeathStateAffected(); // dead state
		this.addCommand(actor.name(), 'actor', enabled);
	}
	this.addCommand('Finished', 'finish', (this._dispatched > 0));
};

Window_Dispatch.prototype.reactivate = function() {
	this.refresh();
    this.select(0);
    this.activate();
};

// --- WINDOW INFO ------------------------------------------------------------
function Window_Info() {
	this.initialize(...arguments);
}

Window_Info.prototype = Object.create(Window_Base.prototype);
Window_Info.prototype.constructor = Window_Info;

Window_Info.prototype.initialize = function(rect) {
	Window_Base.prototype.initialize.call(this, rect);
	this._msg = "";
};

Window_Info.prototype.setup = function() {
	this._msg = "Select characters to dispatch!";
	this.refresh();
};

Window_Info.prototype.refresh = function() {
	this.contents.clear();
	this.drawTextEx(this._msg, 0, 0);
};

})();

/******************************************************************************
	global functions
******************************************************************************/

function GTBS() {
	throw new Error("This is a static class");
}

GTBS.setup = function(troopId, canEscape, canLose) {
	this.initMembers();
	this._canEscape = canEscape;
    this._canLose = canLose;
    $gameTroop.setup(troopId);
	// --
	this.setupEvents();
	this.setupTurnOrder();
	// --
	$gameScreen.onBattleStart();
};

GTBS.initMembers = function() {
	this._phase = "";
    this._canEscape = false;
    this._canLose = false;
    this._eventCallback = null;
	this._mapBgm = null;
	this._mapBgs = null;
	// --
	this._events = [];
	this._turnOrder = []
	this._data = {};
	this._currentUnit = -1;
	this._startPosition = null;
	this._battler = null;
};

GTBS.setEventCallback = function(callBack) {
	this._eventCallback = callBack;
};

GTBS.saveBgmAndBgs = function() {
    this._mapBgm = AudioManager.saveBgm();
    this._mapBgs = AudioManager.saveBgs();
};

GTBS.playBattleBgm = function() {
	AudioManager.playBgm($gameSystem.battleBgm());
    AudioManager.stopBgs();
};

GTBS.setupEvents = function() {
	this._events = [];
	for (const event of $gameMap.events()) {
		if (!event.meta.enemy) continue;
		this._events.push(event);
	}
};

GTBS.event = function(x, y) {
	const list = this._events.filter(event => event.pos(x, y));
	const eventId = list.length > 0 ? list[0].eventId() : 0;
	return eventId > 0 ? $gameMap.event(eventId) : null;
};

GTBS.setupTurnOrder = function() {
	this._turnOrder = [];
	/* - Setup Actors - */
	const actors = {};
	for (const actor of $gameParty.battleMembers()) {
		const init = actor.initiative();
		actors[actor._actorId] = init;
		console.log("actor("+actor.name()+") - " +init);
	}
	let value = Object.values(actors);
	value = Math.round(value.reduce((r,v) => r+v) / value.length);
	this._turnOrder.push({
		type: 'party',
		init: Math.max(1, value)
	});
	/* - Setup Enemies - */
	const enemies = {};
	for (const enemy of $gameTroop.members()) {
		const init = enemy.initiative();
		enemies[enemy._enemyId] = init;
		console.log("enemy("+enemy._enemyId+") - " +init);
	}
	//value = Object.values(enemies);
	//value = Math.round(value.reduce((r,v) => r+v) / value.length);
	this._turnOrder.push({
		type: 'troop',
		init: 0
	});
	/* - Sort Turn Order - */
	this._turnOrder.sort((a,b) => b.init - a.init);
};

GTBS.setSpawn = function() {
	this._phase = "init";
	const dist = Number(params['spawnRadius']);
	this.setUnit($gamePlayer, dist);
};

GTBS.setUnit = function(unit, distance) {
	const grid = new Noble_Unit(unit, distance);
	this._currentUnit = Object.keys(this._data).length;
	this._data[this._currentUnit] = grid;
};

GTBS.getUnit = function(unitId) {
	unitId ??= this._currentUnit;
	return this._data[unitId];
};

GTBS.startX = function(index) {
	return this.getUnit()._start.x[index];
};

GTBS.startY = function(index) {
	return this.getUnit()._start.y[index];
};

GTBS.startD = function() {
	return this.getUnit()._start.dir;
};

GTBS.clearGrid = function(resetPhase) {
	if (!!resetPhase) GTBS._phase = "";
	if (this._currentUnit >= 0) {
		this.getUnit().clear();
		delete this._data[this._currentUnit];
		this._currentUnit--;
	}
};

GTBS.isMoving = function() {
	return this._phase === "move";
};

GTBS.isSelector = function() {
	return this._phase === "select";
};

GTBS.getGrid = function() {
	return this.getUnit()._gridData || [];
};

// ===========================================================================
function Noble_Unit() {
	this.initialize(...arguments);
}

Noble_Unit.prototype.initialize = function(unit, distance) {
	this._unit = unit;
	this._distance = distance;
	this.initUnitType();
	this._gridData = this.addCircleAroundSource();
	this._grid = new Sprite_Grid();
	this._start = {
		x: [unit.screenX(), unit.x],
		y: [unit.screenY(), unit.y],
		dir: unit._direction
	};
};

Noble_Unit.prototype.clear = function() {
	this._grid.clear();
	this._grid = null;
	this._type = "";
	const x = this._start.x[1];
	const y = this._start.y[1];
	const d = this._start.dir;
	this._start = null;
	this._unit.locate(x, y);
	this._unit.setDirection(d);
	this._unit.refresh();
	this._unit = null;
	this._distance = 0;
};

Noble_Unit.prototype.initUnitType = function() {
	switch (this._unit.constructor) {
		case Game_Player:
			this._type = "actor";
			break;
		case Game_Follower:
			this._type = "ally";
			break;
		case Game_Event:
			this._type = "enemy";
			break;
		default:
			this._type = "";
			break;
	}
};

/*Creates a grid object based of the unit's position and max distance around them.
Requirements for Unit:
* Must be subClass of Game_Character
Set's the _grid object
*/
Noble_Unit.prototype.addCircleAroundSource = function() {
	const unit = this._unit;
	const distance = this._distance;
	const data = [];
	movementSearchLimitFlag = true;
	for (let x = unit.x - distance; x <= unit.x + distance; x++){
		for (let y = unit.y - distance; y <= unit.y + distance; y++){
			if (this.validMoveLoc(x, y)){
				data.push([x,y]);
			}
		}
	}
	movementSearchLimitFlag = false;
	return data;
}

Noble_Unit.prototype.validMoveLoc = function(x, y) {
	const distanceAway = this._unit.getDistanceFrom(x, y);
	return this._distance >= distanceAway && distanceAway >= 0;
};

// --

function createCustomEvent(params) {
	const eventId = newEventId();
	const enemyId = params[0][0];
	battleEvents[eventId] = {
		id: eventId,
		name: params[0][3] || "",
		note: params[0][4] || "",
		pages: constructEventPage([], params[1]),
		x: params[0][1],
		y: params[0][2]
	};
	DataManager.extractMetadata(battleEvents[eventId]);
	// Now create the event entry on Game_Map
	const mapId = $gameMap._mapId;
	$gameMap._events[eventId] = new Noble_Event(mapId, eventId);
	return $gameMap.event(eventId);
}

function newEventId() {
	return $gameMap.events().length + 1;
}

// To change specific parts of event page use:
// * params: [['command', args],['command', args],...]
// command: section to edit (ex: 'conditions', 'image', 'misc', etc)
// args: the data to modify (defaults are provided if none are to be changed)
function constructEventPage(pages, params) {
	const newPage = {};
	// Conditions
	let data = eventData(params, 'conditions');
	newPage.conditions = {
		actorId: data.actorId,           actorValid: data.actorValid,
		itemId: data.itemId,             itemValid: data.itemValid,
		selfSwitchCh: data.selfSwitchCh, selfSwitchValid: data.selfSwitchValid,
		switch1Id: data.switch1Id,  	 switch1Valid: data.switch1Valid,
		switch2Id: data.switch2Id,		 switch2Valid: data.switch2Valid,
		variableId: data.variableId,	 variableValid: data.variableValid,
		variableValue: data.variableValue
	};
	// Direction Fix
	data = eventData(params, 'dirFix');
	newPage.directionFix = data.directionFix;
	// Image
	data = eventData(params, 'image');
	newPage.image = {
		characterIndex: data.characterIndex,
		characterName: data.characterName,
		direction: data.direction,
		pattern: data.pattern,
		tileId:	data.tileId
	};
	// Interpreter List
	data = eventData(params, 'list');
	if (typeof data.list === 'number') {
		// Common Event ID - Transplants list as own:
		data.list = $dataCommonEvents[data.list].list;
	}
	newPage.list = data.list;
	// Movement Frequency (6 = player?)
	data = eventData(params, 'moveFreq');
	newPage.moveFrequency = data.moveFreq;
	// Move Route
	data = eventData(params, 'moveRoute');
	if (typeof data.list === 'number') {
		// Common Event ID - Transplants list as own:
		data.list = $dataCommonEvents[data.list].list;
	}
	newPage.moveRoute = {
		list: data.list,
		repeat: data.repeat,
		skippable: data.skippable,
		wait: data.wait
	};
	// Misc Settings
	data = eventData(params, 'misc');
	newPage.moveSpeed = data.moveSpeed;
	newPage.moveType = data.moveType;
	newPage.priorityType = data.priorityType;
	newPage.stepAnime = data.stepAnime;
	newPage.through = data.through;
	newPage.trigger = data.trigger;
	newPage.walkAnime = data.walkAnime;
	// Finalize
	pages.push(newPage);
	return pages;
}

function eventData(params, command) {
	let data = {};
	switch (command) {
		case 'conditions': data = {
			actorId: 1,       actorValid: false,
			itemId: 0,        itemValid: false,
			selfSwitchCh: "", selfSwitchValid: false,
			switch1Id: 1,     switch1Valid: false,
			switch2Id: 1,	  switch2Valid: false,
			variableId: 1,    variableValid: false, 
			variableValue: 0
		}; break;
		case 'dirFix': data = {
			directionFix: false
		}; break;
		case 'image': data = {
			characterIndex: 0,
			characterName: "",
			direction: 2,
			pattern: 1,
			tileId:	0
		}; break;
		case 'list': data = {
			list: [{code:0,indent:0,parameters:[]}]
		} break;
		case 'moveFreq': data = {
			moveFreq: 5
		}; break;
		case 'moveRoute': data = {
			list: [{code:0,indent:0,parameters:[]}],
			repeat: true,
			skippable: false,
			wait: false
		}; break;
		case 'misc': data = {
			moveSpeed: 4,
			moveType: 0,
			priorityType: 1,
			stepAnime: false,
			through: false,
			trigger: 0,
			walkAnime: true
		}; break;
	}
	const list = params.filter(key => key[0] === condition)[0] || [];
	return list[1] || data;
}

function getBattlerMeta(enemyId) {
	const tag = /<BATTLER:\s([A-Z]+)[ ](\d+)>/i;
	let sprite = "";
	let index = 0;
	if ($dataEnemies[enemyId].note.match(tag)) {
		sprite = RegExp.$1;
		index = Number(RegExp.$2);
	}
	return [index, sprite];
}

function getDirectionToPlayer(x1, y1) {
	const x2 = $gamePlayer.x;
	const y2 = $gamePlayer.y;
	const deltaX = $gameMap.deltaX(x1, x2);
	const deltaY = $gameMap.deltaY(y1, y2);
	if (deltaY1 > 0) {
        return 2;
    } else if (deltaX1 < 0) {
        return 4;
    } else if (deltaX1 > 0) {
        return 6;
    } else if (deltaY1 < 0) {
        return 8;
    }
	return 0;
}

Array.prototype.gridLoc = function(x, y) {
  for (const grid of this) {
	  if (grid[0] == x && grid[1] == y) {
		  return true;
	  }
  }
  return false;
}