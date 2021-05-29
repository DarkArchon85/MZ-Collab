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

/******************************************************************************
	plugin specific functions and classes
******************************************************************************/

/******************************************************************************
	rmmv_managers.js
******************************************************************************/

/******************************************************************************
	rmmv_objects.js
******************************************************************************/

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
	if (this.isFollower()) {
		return $gamePlayer.posNt(x, y);
	}
	return false;
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