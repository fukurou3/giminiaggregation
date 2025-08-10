import { useState, useEffect } from 'react';

interface UseNavbarHeightReturn {
  isNavbarWrapped: boolean;
  navbarHeight: number;
}

export const useNavbarHeight = (): UseNavbarHeightReturn => {
  const [isWrapped, setIsWrapped] = useState(false);

  useEffect(() => {
    const checkNavbarWrap = () => {
      const screenWidth = window.innerWidth;
      
      // 416px以下の場合の幅計算（Navbarと同じロジック）
      if (screenWidth <= 416) {
        const logoWidth = 160;
        const navLinksWidth = 180;
        const searchIconWidth = 40;
        const userActionsWidth = 60;
        const minPadding = 8;
        const minGap = 12;
        
        const totalRequiredWidth = logoWidth + navLinksWidth + searchIconWidth + userActionsWidth + minPadding + (minGap * 2);
        setIsWrapped(screenWidth < totalRequiredWidth);
        return;
      }
      
      // 通常の場合の幅計算（Navbarと同じロジック）
      const logoWidth = 180;
      const navLinksWidth = 200;
      const searchWidth = screenWidth >= 640 ? 208 : 160;
      const userActionsWidth = 80;
      const minPadding = screenWidth >= 640 ? 16 : 8;
      const minGap = 20;
      
      const totalRequiredWidth = logoWidth + navLinksWidth + searchWidth + userActionsWidth + minPadding + (minGap * 2);
      setIsWrapped(screenWidth < totalRequiredWidth);
    };

    checkNavbarWrap();
    window.addEventListener('resize', checkNavbarWrap);
    
    // 初期レンダリング後に再チェック
    const timer = setTimeout(checkNavbarWrap, 100);

    return () => {
      window.removeEventListener('resize', checkNavbarWrap);
      clearTimeout(timer);
    };
  }, []);

  return {
    isNavbarWrapped: isWrapped,
    navbarHeight: isWrapped ? 96 : 76 // 2行時は約96px、1行時は76px
  };
};