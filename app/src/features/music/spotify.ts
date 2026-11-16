//This file contains functions for normalizing and opening Spotify playlist links in a React Native application.
// It includes a regular expression to validate Spotify playlist IDs and handles both Spotify URIs and standard URLs. 
// The `normalizeSpotifyPlaylist` function returns a normalized URL or null if the input is invalid, while the 
// `openSpotifyPlaylist` function attempts to open the normalized URL using the device's default browser.
import { Linking } from 'react-native';

const PLAYLIST_ID = /^[A-Za-z0-9]{22}$/;

export function normalizeSpotifyPlaylist(
  input: string,
): string | null {
  const value = input.trim();

  // Support Spotify playlist URIs.
  const uriMatch = value.match(
    /^spotify:playlist:([A-Za-z0-9]{22})$/,
  );

  if (uriMatch) {
    return `https://open.spotify.com/playlist/${uriMatch[1]}`;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'open.spotify.com'
    ) {
      return null;
    }

    const parts = url.pathname.split('/').filter(Boolean);

    // Support normal and international Spotify links.
    if (parts[0]?.startsWith('intl-')) {
      parts.shift();
    }

    if (
      parts.length !== 2 ||
      parts[0] !== 'playlist' ||
      !PLAYLIST_ID.test(parts[1])
    ) {
      return null;
    }

    // Strip tracking parameters.
    return `https://open.spotify.com/playlist/${parts[1]}`;
  } catch {
    return null;
  }
}

export async function openSpotifyPlaylist(
  playlistUrl: string,
): Promise<void> {
  const url = normalizeSpotifyPlaylist(playlistUrl);

  if (!url) {
    throw new Error('Invalid Spotify playlist link.');
  }

  await Linking.openURL(url);
}
