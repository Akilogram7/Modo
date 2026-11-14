//lets users enter and test a playlist link
import { useState } from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { fonts } from '../../theme';
import {
    normalizeSpotifyPlaylist,
    openSpotifyPlaylist,
} from './spotify';

type Props = {
  playlistUrl: string;
  onPlaylistChange: (url: string) => void;
  playlistName: string;
  onPlaylistNameChange: (name: string) => void;
  textColor: string;
  accentColor: string;
};

export default function MusicSettings({
  playlistUrl,
  onPlaylistChange,
  playlistName,
  onPlaylistNameChange,
  textColor,
  accentColor,
}: Props) {
    const [opening, setOpening] = useState(false);

    const normalized = normalizeSpotifyPlaylist(playlistUrl);
    const hasInput = playlistUrl.trim().length > 0;

    async function testPlaylist() {
        if (!normalized || opening) return;

        setOpening(true);

        try {
            await openSpotifyPlaylist(normalized);
        } catch {
            Alert.alert(
                'Unable to open Spotify',
                'Please check the playlist link and try again.',
            );
        } finally {
            setOpening(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={[styles.heading, { color: textColor }]}>
                SPOTIFY PLAYLIST
            </Text>
            <TextInput
                value={playlistName}
                onChangeText={onPlaylistNameChange}
                placeholder="Playlist name (e.g. Deep Focus)"
                placeholderTextColor="#777"
                style={styles.input}
            />
            <TextInput
                value={playlistUrl}
                onChangeText={onPlaylistChange}
                placeholder="Paste Spotify playlist link"
                placeholderTextColor="#777"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.input}
            />

            {hasInput && !normalized && (
                <Text style={styles.error}>
                    Enter a valid Spotify playlist link.
                </Text>
            )}

            <Pressable
                disabled={!normalized || opening}
                onPress={testPlaylist}
                style={[
                    styles.button,
                    { backgroundColor: accentColor },
                    (!normalized || opening) && styles.disabled,
                ]}
            >
                <Text style={styles.buttonText}>
                    {opening ? 'OPENING...' : 'TEST PLAYLIST'}
                </Text>
            </Pressable>

            <Text style={[styles.helper, { color: textColor }]}>
                Your playlist opens in Spotify or your browser.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    heading: {
        fontSize: 17,
        fontFamily: fonts.headingBold,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#222',
    },
    button: {
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: fonts.headingBold,
    },
    disabled: {
        opacity: 0.45,
    },
    error: {
        color: '#B42318',
        fontSize: 13,
    },
    helper: {
        fontSize: 12,
    },
});
