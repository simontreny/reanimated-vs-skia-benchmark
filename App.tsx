import React from 'react';
import {View} from 'react-native';
import {ConfettiReanimated} from './ConfettiReanimated';
import {ConfettiSkia} from './ConfettiSkia';

function App(): JSX.Element {
  return (
    <View style={{flex: 1, backgroundColor: 'white'}}>
      {/* <ConfettiReanimated config={{count: 50}} /> */}
      <ConfettiSkia config={{count: 50}} />
    </View>
  );
}

export default App;
