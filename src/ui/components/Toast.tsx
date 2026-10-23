import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Msg } from '../../domain/copy';
import { colors, radius, space } from '../theme';

/** In-app stand-in for the post-transaction push notification. */
export function Toast({ msg, onDone }: { msg: Msg | null; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(onDone, 4500);
    return () => clearTimeout(id);
  }, [msg]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only for a new message
  if (!msg) return null;
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable onPress={onDone} style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <View style={styles.appIcon}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>₹</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{msg.title}</Text>
          <Text style={styles.body}>{msg.body}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: space(3), left: space(3), right: space(3), zIndex: 50 },
  toast: { flexDirection: 'row', backgroundColor: colors.ink, borderRadius: radius.md, padding: space(3), alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  appIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: space(3) },
  title: { color: '#fff', fontWeight: '700', fontSize: 14 },
  body: { color: '#E7E5E4', fontSize: 13, marginTop: 2 },
});
