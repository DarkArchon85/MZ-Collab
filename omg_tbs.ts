/** /*:
 * @author LST
 * 
 */
(() => {

    /**
     * Debug window used for outputting information on top
     * of everything else.
     */
    class Window_LSTDebug extends Window_Base {
        constructor(rect) {
            super(rect);
            this.opacity = 0;
            this.text = '';
        }

        refresh() {
            this.contents.clear();
            this.drawTextEx(this.text, 0, 0);
        }

        setText(text) {
            this.text = text;
            this.refresh();
        }
    }

    /**
     * Scene Map Aliasing and data appending
     */
    class LST_Map extends Scene_Map {
        _editorMode:boolean = true;
        constructor() {
            super(arguments);
        }

        /**
         * Add to the start section
         */
        start() {
            super.start();
            this.createDebugInfo();

        }

        /**
         * Create debugging information.
         */
        createDebugInfo() {
            this.debugText = new Window_LSTDebug(new Rectangle(0, 0, Graphics.width, Graphics.height));
            this.addChild(this.debugText);

            this.debugText.setText(`LST TBS System\\}\n - Editor: v 0.01\n - Map: ${$dataMap.width}x${$dataMap.height}\\{`);
        }

        /**
         * Update function
         */
        update() {
            super.update()
        }
    } Scene_Map = LST_Map;
})();