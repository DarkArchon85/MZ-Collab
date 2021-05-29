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
 * @param Movement Grid
 *
 * @param MovementGrid.maxSize
 * @text Maximum Search Area for Grid (JS-Number)
 * @parent Movement Grid
 * @desc Define the search limit for Game Characters when using Movement Grid. Zero or less use RPGMZ default (12)
 * @default 0
 * @type multiline_string
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

/******************************************************************************
	plugin commands
******************************************************************************/
//PluginManager.registerCommand(pluginName, '', args => {});

/******************************************************************************
	plugin specific functions and classes
******************************************************************************/

Game_Character.prototype.getDistanceFrom = function(goalX, goalY) {
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

Game_Character.prototype.searchLimit = (function(){
	var searchLimit = Game_Character.prototype.searchLimit;
	return function(){
		var originalResult = searchLimit.apply(this,arguments);
		return movementSearchLimitFlag ? betterEval(lvParams["MovementGrid.maxSize"],Number) || originalResult : originalResult;
	}
})();

//Will most likely change this or clone it
Game_Player.prototype.moveByInput = function() {
    if (!this.isMoving() && this.canMove()) {
        let direction = this.getInputDirection();
        if (direction > 0) {
            $gameTemp.clearDestination();
        } else if ($gameTemp.isDestinationValid()) {
            const x = $gameTemp.destinationX();
            const y = $gameTemp.destinationY();
            direction = this.findDirectionTo(x, y);
        }
        if (direction > 0) {
            this.executeMove(direction);
        }
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

let movementSearchLimitFlag = false;

betterEval = function(funString, expectedType, args=[]){
	return expectedType(new Function("return " + funString)(...args))
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

BattleGrid_Movement.prototype.initialize = function() {
	this._unit = null;
	this._dist = 0;
	this._grid = [];
};

BattleGrid_Movement.prototype.setUp = function(unit, distance){
	this._unit = unit;
	this._dist = distance;
};

/*Creates a grid object based of the unit's position and max distance around them.
Requirements for Unit:
* Must have x and y parameters defined as TODO
* Must have a movement function defined as TODO
Returns a gridObject
*/
BattleGrid_Movement.prototype.calculateGrid = function(){
	this._grid = []
	movementSearchLimitFlag = true;
	for (let x = this._unit.x - this._dist; x <= this._unit.x + this._dist; x++){
		for (let y = this._unit.y - this._dist; y <= this._unit.y + this._dist; y++){
			if (this.inGrid(x,y)){
				this._grid.push([x,y])
				$dataMap.data[(1 * $dataMap.height + y) * $dataMap.width + x] = 6
			}
			else{
				$dataMap.data[(1 * $dataMap.height + y) * $dataMap.width + x] = 0
			}
		}
	}
	movementSearchLimitFlag = false;	
}

BattleGrid_Movement.prototype.inGrid = function(x,y){
	distanceAway = this._unit.getDistanceFrom(x,y)
	return this._dist >= distanceAway && distanceAway >= 0
}