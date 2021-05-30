// ============================================================================
//  MZ Collab Plugin - Grid Tactical Battle System
//  LvMZ_SirLegna_GTBS.js
// ============================================================================

var Imported = Imported || {};
Imported["LvMZ_SirLegna_GTBS"] = true;


/*:
 * @target MZ
 * @plugindesc [v1.0] 
 * @author LordValinar, SirLegna
 * @url 
 *
 *
 * @ --------------------------------------------------------------------------
 * Plugin Parameters
 * @ --------------------------------------------------------------------------
 *
 * @param Movement Grid
 *
 * @param MovementGrid.maxSize
 * @text Maximum Search Area for Grid (JS-Number)
 * @parent Movement Grid
 * @desc Define the search limit for Game Characters when using Movement Grid. Zero or less use RPGMZ default (12)
 * @default 0
 * @type multiline_string
 *
 * @ --------------------------------------------------------------------------
 * Plugin Commands
 * @ --------------------------------------------------------------------------
 *
 * @command setFollowerCtrl
 * @text Toggle Follower Control
 *
 * @arg ctrl
 * @text Manual Control Override
 * @type boolean
 * @on Enable Manual Control
 * @off Disable Control (default)
 * @desc Toggle manual follower control.
 * @default false
 *
 * @ --------------------------------------------------------------------------
 *
 * @command setFollower
 * @text Set Follower
 * @desc Sets the follower (or player) to control
 *
 * @arg id
 * @text Follower ID
 * @type number
 * @decimals 0
 * @min 0
 * @desc Get the follower ID (or 0 for Player) to control.
 * @default 0
 *
 *
 * @help
 * ----------------------------------------------------------------------------
 * Instructions
 * ----------------------------------------------------------------------------
 *
 *
 *
 * ----------------------------------------------------------------------------
 * Core Functionality that were changed
 * ----------------------------------------------------------------------------
 *	* None
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
 * v0.0 - Plugin started (delete on release)!
 *
 * ----------------------------------------------------------------------------
 */

/******************************************************************************
	plugin structs
******************************************************************************/

/******************************************************************************
	private
******************************************************************************/

(() => {
'use strict';

const pluginName = 'LvMZ_SirLegna_GTBS';
const lvParams = PluginManager.parameters(pluginName);

// - Individual Follower Control -
let followerCtrl = false;
let followerID   = 0;

/******************************************************************************
	plugin commands
******************************************************************************/
//PluginManager.registerCommand(pluginName, '', args => {});
PluginManager.registerCommand(pluginName, 'setFollowerCtrl', args => {
	followerCtrl = eval(args.ctrl);
});

PluginManager.registerCommand(pluginName, 'setFollower', args => {
	followerID = Number(args.id);
});

/******************************************************************************
	plugin specific functions and classes
******************************************************************************/

//-----------------------------------------------------------------------------
// BattleGrid_Movement
//
// The game object class movement on the Battle Grid

/******************************************************************************
	rmmv_managers.js
******************************************************************************/

/******************************************************************************
	rmmv_objects.js
******************************************************************************/

// --- CHARACTER ---
//Custom - Calculates the distance between a Game_Character and a goal Tile; returns distance or -1 if not possible
Game_Character.prototype.getDistanceFrom = function(goalX, goalY) { //Custom
    const searchLimit = this.searchLimit();
    const mapWidth = $gameMap.width();
    const nodeList = [];
    const openList = [];
    const closedList = [];
    const start = {};
    let best = start;

    if (this.x === goalX && this.y === goalY) {
        return closedList.length;
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
            return best.f//(this.x == goalX || this.y == goalY ? openList.length : openList.length);
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

//Alias - Uses MovementGrid.maxSize if the movementSearchLimitFlag is true else uses default
Game_Character.prototype.searchLimit = (function(){ //Alias
	var searchLimit = Game_Character.prototype.searchLimit;
	return function(){
		var originalResult = searchLimit.apply(this,arguments);
		return movementSearchLimitFlag ? betterEval(lvParams["MovementGrid.maxSize"],Number) || originalResult : originalResult;
	}
})();

// --- CHARACTER BASE ---
Game_CharacterBase.prototype.isFollower = function() {
	return false;
};

const gameCharBase_collidedWithChars = Game_CharacterBase.prototype.isCollidedWithCharacters;
Game_CharacterBase.prototype.isCollidedWithCharacters = function(x, y) {
	if (this.isCollidedWithFollowers(x, y)) return true;
	if (this.isCollidedWithPlayer(x, y)) return true;
	return gameCharBase_collidedWithChars.call(this, x, y);
}

// New - Additional collision detections
Game_CharacterBase.prototype.isCollidedWithFollowers = function(x, y) {
	if (!this.isFollower()) {
		const f = $gamePlayer._followers._data;
		for (let i = 0; i < f.length; i++) {
			if (f[i].posNt(x, y)) return true;
		}
	}
	return false;
};

Game_CharacterBase.prototype.isCollidedWithPlayer = function(x, y) {
	return this.isFollower() && $gamePlayer.posNt(x, y);
};

// --- GAME FOLLOWER ---
// Changed so each follower has visibility conditions instead of the group
const gameFollower_init = Game_Follower.prototype.initialize;
Game_Follower.prototype.initialize = function(memberIndex) {
	gameFollower_init.call(this, memberIndex);
	this._visible = $dataSystem.optFollowers;
};

// Overwrite - Checks individual visible conditions
Game_Follower.prototype.isVisible = function() {
    return this.actor() && this._visible;
};

// New - Determines if the character is a follower
Game_Follower.prototype.isFollower = function() {
	return true;
};

//
const gameFollower_update = Game_Follower.prototype.update;
Game_Follower.prototype.update = function() {
	if (followerCtrl) {
		Game_Character.prototype.update.call(this);
	} else {
		gameFollower_update.call(this);
	}
};


// --- GAME_FOLLOWERS ---
// Overwrite - Toggles visibility for all followers with new method
Game_Followers.prototype.show = function() {
	for (const follower of this._data) {
		follower._visible = true;
	}
};

// Overwrite - Toggles visibility for all followers with new method
Game_Followers.prototype.hide = function() {
    for (const follower of this._data) {
		follower._visible = false;
	}
};

// Alias - Only update follower movement if they're following
const gameFollowers_updateMove = Game_Followers.prototype.updateMove;
Game_Followers.prototype.updateMove = function() {
	if (!followerCtrl) gameFollowers_updateMove.call(this);
};


// --- GAME INTERPRETER ---
const gameIntr_character = Game_Interpreter.prototype.character;
Game_Interpreter.prototype.character = function(param) {
	if ($gameParty.inBattle()) {
		return null;
	} else if (param < 0 && followerCtrl && followerID > 0) {
		return $gamePlayer.followers().follower(followerID - 1);
	} else {
		return gameIntr_character.call(this, param);
	}
};

/******************************************************************************
	rmmv_scenes.js
******************************************************************************/

/******************************************************************************
	rmmv_sprites.js
******************************************************************************/

/******************************************************************************
	rmmv_windows.js
******************************************************************************/

})();

/******************************************************************************
	public 
******************************************************************************/

// - Flag to overwrite the SearchLimit when using Movement Grid -
let movementSearchLimitFlag = false;

// - Better Eval function, takes in a string, the expected type and optional arguments and return the eval - 
betterEval = function(funString, expectedType, args=[]){
	return expectedType(new Function("return " + funString)(...args))
}

/******************************************************************************
	Grid Class
******************************************************************************/
function Grid(){
	this.initialize(...arguments);
}

Object.defineProperties(Grid.prototype, {
	// unit
	data: {
		get: function() {
			return this._data;
		},
		configurable: true
	},
});

Grid.prototype.initialize = function() {
	this.clear()
}

Grid.prototype.clear = function(){
	this._data = [];
}

/*Creates a grid object based of the unit's position and max distance around them.
Requirements for Unit:
* Must be subClass of Game_Character
Set's the _grid object
*/
Grid.prototype.addCircleAroundSource = function(sourceX,sourceY,distance,inGrid){
	movementSearchLimitFlag = true;
	for (let x = sourceX - distance; x <= sourceX + distance; x++){
		for (let y = sourceY - distance; y <= sourceY + distance; y++){
			if (inGrid(x,y)){
				this._data.push([x,y])
			}
			else{
			}
		}
	}
	movementSearchLimitFlag = false;	
}

/******************************************************************************
	BattleGrid_Movement Class
******************************************************************************/
function BattleGrid_Movement() {
    this.initialize(...arguments);
}

Object.defineProperties(BattleGrid_Movement.prototype, {
	// unit
	unit: {
		get: function() {
			return this._unit;
		},
		set:function (gameObj){
			this._unit = gameObj;
		},
		configurable: true
	},
	// distance
	distance: {
		get: function() {
			return this._dist;
		},
		set:function (dist){
			this._dist = dist;
		},
		configurable: true
	},
});

//Defaults values
BattleGrid_Movement.prototype.initialize = function() {
	this._unit = null;
	this._dist = 0;
	this._grid = new Grid();
};

//Quick setUp for both unit and distance however can use get
BattleGrid_Movement.prototype.setUp = function(unit, distance){
	this._unit = unit;
	this._dist = distance;
	this._grid.addCircleAroundSource(unit.x,unit.y,distance,this.validMoveLoc.bind(this));
};

BattleGrid_Movement.prototype.validMoveLoc = function(x,y){
	distanceAway = this._unit.getDistanceFrom(x,y)
	return this._dist >= distanceAway && distanceAway >= 0
}
