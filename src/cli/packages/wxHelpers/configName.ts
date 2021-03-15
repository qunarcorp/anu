import chalk from 'chalk';
import lintQueue from '../utils/lintQueue';



module.exports = function mapConfigName(config: any, patch: any, sourcePath:string) {
    if (config.window){
        modifyValue(config.window, sourcePath);
    }
    modifyValue(config, sourcePath);
};


const mapColor: any = {
    "#fff": "white",
    "#ffffff": "white",
    '#000': 'black',
    '#000000': 'black',
 };
 const mapBg: any = {
    "#fff": "light",
    "#ffffff": "light",
    '#000': 'dark',
    '#000000': 'dark',
 };
function modifyValue(object: any, sourcePath:string) {
    var p = sourcePath.split(/\/source\//).pop();
    var barColor = object.navigationBarTextStyle, color, bg;
    if(barColor!== 'white' && barColor !== 'black'){
        color = mapColor[barColor] || 'white'
        if(barColor){
            lintQueue.push({
                level: 'warn',
                msg: `${p} 里navigationBarTextStyle的值为${barColor}, 强制转换为${color}.`
            });
            
            object.navigationBarTextStyle = color;
        }
    }else{
        color = barColor;
    }
    var barBg =  object.backgroundTextStyle;
    if(barBg!== 'dark' && barBg !== 'light'){
        bg = mapBg[barBg];
        if(!bg){
            bg = color === 'white' ? 'dark': 'light'
        }
        if(barBg){
            object.backgroundTextStyle = bg;

            lintQueue.push({
                level: 'warn',
                msg: `${p}里backgroundTextStyle的值为${barBg}, 强制转换为${bg}.`
            });
        }
   }
}
