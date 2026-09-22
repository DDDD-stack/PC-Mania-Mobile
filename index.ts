import { registerRootComponent } from 'expo';

// Defines the background order-check task; must load before the app renders.
import './src/notifications';
import App from './App';

registerRootComponent(App);
