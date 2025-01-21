// page.tsx
import { NextPage } from 'next';
import AvatarViewer from '../components/AvatarViewer'; // AvatarViewer.js のパス

const Home: NextPage = () => {
  return (
    <div>
      <AvatarViewer />
    </div>
  )
};

export default Home;
