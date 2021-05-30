// ============================================================================
//  Noble Plugins - Grid Tactical Battle System
//  Noble_GTBS_core.js
// ============================================================================

var Imported = Imported || {};
Imported["Noble_GTBS_core"] = true;


/*:
 * @target MZ
 * @plugindesc [v1.0] 
 * @author LordValinar, SirLegna
 * @url 
 * @orderBefore Noble_GTBS_main
 *
 * @ --------------------------------------------------------------------------
 * Plugin Parameters
 * @ --------------------------------------------------------------------------
 *
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
	this._gridLayer = null;
};

//Quick setUp for both unit and distance however can use get
BattleGrid_Movement.prototype.setUp = function(unit, distance){
	this._unit = unit;
	this._dist = distance;
	this._grid.addCircleAroundSource(unit.x,unit.y,distance,this.validMoveLoc.bind(this));
	this._gridLayer = new Sprite_BattleGrid(this._grid);
};

BattleGrid_Movement.prototype.validMoveLoc = function(x,y){
	distanceAway = this._unit.getDistanceFrom(x,y);
	return this._dist >= distanceAway && distanceAway >= 0;
}

BattleGrid_Movement.prototype.removeGrid = function() {
	this._gridLayer.clear(this);
};

/******************************************************************************
	Sprite_BattleGrid
******************************************************************************/
function Sprite_BattleGrid() {
	this.initialize(...arguments);
}

Sprite_BattleGrid.prototype = Object.create(Sprite.prototype);
Sprite_BattleGrid.prototype.constructor = Sprite_BattleGrid;

Sprite_BattleGrid.prototype.initialize = function(list) {
	Sprite.prototype.initialize.call(this);
	const w = $gameMap.width();
	const h = $gameMap.height();
	const multX = $gameMap.tileWidth();
	const multY = $gameMap.tileHeight();
	this.bitmap = new Bitmap(w * multX, h * multY);
	
	for (const grid of list.data) {
		let x = grid[0];
		let y = grid[1];
		if ($gamePlayer.x == x && $gamePlayer.y == y) {
			this.bitmap.fillRect(1 + x * multX, 1 + y * multY, 46, 46, '#e6de0085');
		} else {
			this.bitmap.fillRect(1 + x * multX, 1 + y * multY, 46, 46, '#0099cf85');
		}
	}/* -- floating data: Use or delete (fills up entire map)
	for (let i = 0; i <= w; i++) {
		for (let j = 0; j <= h; j++) {
			if ($gameMap.regionId(i,j) > 0) {
				this.bitmap.fillRect(1 + i * multX, 1 + j * multY, 46, 46, '#0099cf85');
			} else if (!$gameMap.isPassable(i,j)) {
				this.bitmap.fillRect(1 + i * multX, 1 + j * multY, 46, 46, '#c70d0035');
			} else {
				this.bitmap.fillRect(1 + i * multX, 1 + j * multY, 46, 46, '#00000050');
			}
		}
	}*/
	this.z = 1;
	SceneManager._scene._spriteset._tilemap.addChild(this);
};

Sprite_BattleGrid.prototype.update = function() {
	this.x = -$gameMap._displayX * $gameMap.tileWidth();
	this.y = -$gameMap._displayY * $gameMap.tileHeight();
};
	
Sprite_BattleGrid.prototype.clear = function(callBack) {
	this.bitmap.clear();
	callBack._gridLayer = null;
	callBack._grid = new Grid();
};

/******************************************************************************
	rmmv_managers.js
******************************************************************************/

/******************************************************************************
	rmmv_objects.js
******************************************************************************/

// --- CHARACTER BASE ---
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

/******************************************************************************
	rmmv_scenes.js
******************************************************************************/

/******************************************************************************
	rmmv_sprites.js
******************************************************************************/

/******************************************************************************
	rmmv_windows.js
********************