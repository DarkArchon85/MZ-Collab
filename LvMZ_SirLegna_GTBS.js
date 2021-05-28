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
 * @text Maximum Search Area for Grid
 * @parent Movement Grid
 * @desc Define the search limit for Game Characters when using Movement Grid in this plugin
 * @default 0
 * @type number
 * @min 0
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

//-----------------------------------------------------------------------------
// BattleGrid_Movement
//
// The game object class movement on the Battle Grid

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
		}
		configurable: true
	},
	// distance
	distance: {
		get: function() {
			return this._dist;
		},
		set:function (dist){
			this._dist = dist;
		}
		configurable: true
	},
});

BattleGrid_Movement.prototype.initialize = function() {
	this._unit = null;
	this._dist = 0;
	this._grid = []
	this._movementSearchLimitFlag = false;
};

BattleGrid_Movement.prototype.setUp(unit, distance){
	this._unit = unit;
	this._dist = distance;
}

/*Creates a grid object based of the unit's position and max distance around them.
Requirements for Unit:
* Must have x and y parameters defined as TODO
* Must have a movement function defined as TODO
Returns a gridObject
*/
BattleGrid_Movement.prototype.calculateGrid = function(unit, distance){
	
}

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
		return lvParams["MovementGrid.maxSize"] || originalResult;
	}
})();

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