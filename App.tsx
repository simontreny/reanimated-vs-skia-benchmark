import React from 'react';
import {View} from 'react-native';
import {ConfettiReanimated} from './ConfettiReanimated';

function App(): JSX.Element {
  return (
    <View style={{flex: 1, backgroundColor: 'white'}}>
      <ConfettiReanimated config={{count: 50}} />
    </View>
  );
}

export default App;
