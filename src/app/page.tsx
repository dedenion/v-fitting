// page.tsx
import { NextPage } from 'next';
import AvatarViewer from '../components/AvatarViewer'; // AvatarViewer.js のパス
import styles from '../styles/page.module.css'; // スタイル用のCSSファイル

const Home: NextPage = () => {
  return (
    <div>
      <header className={styles.header}>
        <h1>バーチャルフィッティング</h1>
        <p>アバターと服を選んで、バーチャルフィッティングを体験してください。</p>
      </header>
      <AvatarViewer />
    </div>
  );
};

export default Home;
